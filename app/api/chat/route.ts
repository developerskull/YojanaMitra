import { NextRequest } from 'next/server';
import { z } from 'zod';
import { evaluateSchemeEligibility, type EligibilityEvaluation } from '@/lib/eligibility/engine';
import { detectLanguage } from '@/lib/i18n/detect';
import { getLLMProvider } from '@/lib/llm/adapter';
import { buildCitations, hybridSearchSchemes } from '@/lib/rag';
import { extractUserProfile } from '@/lib/rag/profile-extractor';
import {
  buildDeterministicGroundedAnswer,
  buildGroundedContextBlock,
  buildGroundedSystemPrompt,
  getSuggestedFollowups,
  type EvaluatedSchemeSummary,
} from '@/lib/rag/prompt';
import { getSchemeRepository } from '@/lib/schemes/repository';
import {
  SchemeCategorySchema,
  SupportedLangSchema,
  UserProfileSchema,
  type SupportedLang,
} from '@/lib/schemes/schema';

export const runtime = 'nodejs';

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1500),
  preferredLang: SupportedLangSchema.optional(),
  profile: UserProfileSchema.partial().optional(),
  categoryFilter: SchemeCategorySchema.optional(),
  stateFilter: z.string().max(64).optional(),
});

function encodeSSE(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

const STATUS_BONUS: Record<EligibilityEvaluation['status'], number> = {
  eligible: 0.045,
  likely: 0.025,
  missing_info: 0.005,
  not_eligible: -0.05,
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid chat request', issues: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message, preferredLang, profile: savedProfile, categoryFilter, stateFilter } =
    parsed.data;

  const detected = detectLanguage(message, preferredLang ?? 'en');
  const responseLang: SupportedLang = detected.lang;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1. Extract structured user profile
        const mergedProfile = await extractUserProfile(message, savedProfile);
        controller.enqueue(
          encodeSSE('profile', {
            lang: responseLang,
            isCodeMixed: detected.isCodeMixed,
            profile: mergedProfile,
          })
        );

        // 2. Hybrid RAG retrieval (metadata pre-filter + BM25 + vector cosine + RRF)
        const effectiveState = stateFilter ?? mergedProfile.state;
        const retrieved = await hybridSearchSchemes(message, {
          filter: {
            state: effectiveState,
            category: categoryFilter,
          },
          profile: mergedProfile,
          topK: 10,
        });

        // 3. Deterministic eligibility evaluation + rerank (NEVER let LLM decide eligibility)
        const scoredCandidates = retrieved.map((r) => {
          const evaluation = evaluateSchemeEligibility(mergedProfile, r.scheme);
          const combinedRank = r.rrfScore + STATUS_BONUS[evaluation.status];
          return { retrieved: r, evaluation, combinedRank };
        });

        // Also ensure directly eligible state/central schemes for the profile aren't missed
        if (Object.keys(mergedProfile).length >= 2) {
          const existingIds = new Set(scoredCandidates.map((c) => c.retrieved.scheme.id));
          const repoSchemes = getSchemeRepository().filter({
            state: effectiveState,
            category: categoryFilter,
          });
          for (const scheme of repoSchemes) {
            if (existingIds.has(scheme.id)) continue;
            const evaluation = evaluateSchemeEligibility(mergedProfile, scheme);
            if (evaluation.status === 'eligible' && evaluation.matchedRules.length >= 2) {
              scoredCandidates.push({
                retrieved: {
                  scheme,
                  rrfScore: 0.012,
                  vectorScore: 0,
                  bm25Score: 0,
                  topChunks: [],
                },
                evaluation,
                combinedRank: 0.012 + STATUS_BONUS.eligible,
              });
            }
          }
        }

        scoredCandidates.sort((a, b) => b.combinedRank - a.combinedRank);

        // Prefer eligible/likely/missing_info schemes unless user asked directly about an ineligible one
        const nonFailed = scoredCandidates.filter((c) => c.evaluation.status !== 'not_eligible');
        const finalTop = (nonFailed.length > 0 ? nonFailed : scoredCandidates).slice(0, 6);

        const citations = buildCitations(
          finalTop.map((f) => ({
            scheme: f.retrieved.scheme,
            topChunks: f.retrieved.topChunks,
          })),
          responseLang
        );

        const evaluated: EvaluatedSchemeSummary[] = finalTop.map((item, idx) => ({
          scheme: item.retrieved.scheme,
          status: item.evaluation.status,
          matchedReasons: item.evaluation.localized.matchedReasons[responseLang],
          failedReasons: item.evaluation.localized.failedReasons[responseLang],
          missingFields: item.evaluation.missingFields,
          citationId: citations[idx]?.id ?? `S${idx + 1}`,
        }));

        controller.enqueue(
          encodeSSE('schemes', {
            schemes: finalTop.map((item, idx) => ({
              scheme: item.retrieved.scheme,
              citationId: citations[idx]?.id ?? `S${idx + 1}`,
              eligibility: item.evaluation,
            })),
          })
        );

        controller.enqueue(encodeSSE('citations', { citations }));

        // 4. Stream grounded answer (LLM explains deterministic verdict; degraded fallback if no LLM)
        const provider = getLLMProvider();
        let usedDegradedMode = false;

        if (provider.isConfigured() && evaluated.length > 0) {
          try {
            const systemPrompt = buildGroundedSystemPrompt(responseLang);
            const contextBlock = buildGroundedContextBlock(
              evaluated,
              citations,
              mergedProfile,
              responseLang
            );

            for await (const chunk of provider.streamText({
              temperature: 0.15,
              maxTokens: 900,
              messages: [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: `${contextBlock}\n\n<USER_QUERY>\n${message}\n</USER_QUERY>`,
                },
              ],
            })) {
              controller.enqueue(encodeSSE('token', { text: chunk }));
            }
          } catch {
            usedDegradedMode = true;
          }
        } else {
          usedDegradedMode = true;
        }

        if (usedDegradedMode) {
          const fallbackAnswer = buildDeterministicGroundedAnswer(evaluated, responseLang);
          const segments = fallbackAnswer.split(/(\s+)/);
          for (let i = 0; i < segments.length; i += 6) {
            controller.enqueue(encodeSSE('token', { text: segments.slice(i, i + 6).join('') }));
          }
        }

        const followups = getSuggestedFollowups(evaluated, responseLang);
        controller.enqueue(encodeSSE('followups', { followups }));
        controller.enqueue(
          encodeSSE('done', {
            lang: responseLang,
            degradedMode: usedDegradedMode,
            schemeCount: evaluated.length,
          })
        );
      } catch (err) {
        controller.enqueue(
          encodeSSE('error', {
            message:
              err instanceof Error ? err.message : 'Unable to process your request right now.',
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
