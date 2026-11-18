import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getChatResponseCache, type CachedChatResponse } from '@/lib/cache/lru';
import { evaluateSchemeEligibility, type EligibilityEvaluation } from '@/lib/eligibility/engine';
import { detectLanguage } from '@/lib/i18n/detect';
import { getLLMProvider } from '@/lib/llm/adapter';
import { logStructured } from '@/lib/logging/logger';
import { buildCitations, hybridSearchSchemes } from '@/lib/rag';
import { extractUserProfile } from '@/lib/rag/profile-extractor';
import {
  buildDeterministicGroundedAnswer,
  buildGroundedContextBlock,
  buildGroundedSystemPrompt,
  getSuggestedFollowups,
  type EvaluatedSchemeSummary,
} from '@/lib/rag/prompt';
import { extractClientIp, getRateLimiter } from '@/lib/ratelimit/token-bucket';
import { getSchemeRepository } from '@/lib/schemes/repository';
import {
  SchemeCategorySchema,
  SupportedLangSchema,
  UserProfileSchema,
  type SupportedLang,
} from '@/lib/schemes/schema';
import { evaluateInputSafety } from '@/lib/security/guard';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 16 * 1024;

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

function computeCacheKey(input: {
  message: string;
  lang: SupportedLang;
  profile?: Record<string, unknown>;
  categoryFilter?: string;
  stateFilter?: string;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        m: input.message.trim().toLowerCase(),
        l: input.lang,
        p: input.profile ?? {},
        c: input.categoryFilter ?? '',
        s: input.stateFilter ?? '',
      })
    )
    .digest('hex');
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Per-IP Token Bucket Rate Limit
  const clientIp = extractClientIp(req.headers);
  const rateDecision = getRateLimiter().consume(clientIp);
  if (!rateDecision.allowed) {
    logStructured('warn', 'chat_rate_limited', {
      retryAfterMs: rateDecision.retryAfterMs,
    });
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please wait a few seconds and try again.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rateDecision.retryAfterMs / 1000)),
        },
      }
    );
  }

  // 2. Request Body Size Limit
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request payload too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
    if (Buffer.byteLength(rawBodyText, 'utf-8') > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Request payload too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBodyText);
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

  // 3. Prompt-Injection, Harm & Off-Topic Guard
  const safety = evaluateInputSafety(message, responseLang);
  if (!safety.allowed) {
    logStructured('warn', 'chat_guard_refusal', {
      reason: safety.reason,
      lang: responseLang,
    });
    const refusalStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encodeSSE('token', { text: safety.refusalMessage ?? '' }));
        controller.enqueue(
          encodeSSE('done', {
            lang: responseLang,
            degradedMode: false,
            schemeCount: 0,
            guardReason: safety.reason,
          })
        );
        controller.close();
      },
    });
    return new Response(refusalStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  }

  // 4. In-Memory LRU Response Cache lookup
  const cache = getChatResponseCache();
  const cacheKey = computeCacheKey({
    message,
    lang: responseLang,
    profile: savedProfile as Record<string, unknown> | undefined,
    categoryFilter,
    stateFilter,
  });
  const cached = cache.get(cacheKey);

  if (cached) {
    logStructured('info', 'chat_cache_hit', {
      lang: responseLang,
      latencyMs: Date.now() - startTime,
    });
    const cachedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encodeSSE('profile', {
            lang: cached.lang,
            isCodeMixed: cached.isCodeMixed,
            profile: cached.profile,
          })
        );
        controller.enqueue(encodeSSE('schemes', { schemes: cached.schemes }));
        controller.enqueue(encodeSSE('citations', { citations: cached.citations }));
        controller.enqueue(encodeSSE('token', { text: cached.answerText }));
        controller.enqueue(encodeSSE('followups', { followups: cached.followups }));
        controller.enqueue(
          encodeSSE('done', {
            lang: cached.lang,
            degradedMode: cached.degradedMode,
            schemeCount: cached.schemes.length,
            cached: true,
          })
        );
        controller.close();
      },
    });
    return new Response(cachedStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Cache': 'HIT',
      },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 5. Extract structured user profile
        const mergedProfile = await extractUserProfile(message, savedProfile);
        controller.enqueue(
          encodeSSE('profile', {
            lang: responseLang,
            isCodeMixed: detected.isCodeMixed,
            profile: mergedProfile,
          })
        );

        // 6. Hybrid RAG retrieval
        const effectiveState = stateFilter ?? mergedProfile.state;
        const retrieved = await hybridSearchSchemes(message, {
          filter: {
            state: effectiveState,
            category: categoryFilter,
          },
          profile: mergedProfile,
          topK: 10,
        });

        // 7. Deterministic eligibility evaluation & rerank
        const scoredCandidates = retrieved.map((r) => {
          const evaluation = evaluateSchemeEligibility(mergedProfile, r.scheme);
          const combinedRank = r.rrfScore + STATUS_BONUS[evaluation.status];
          return { retrieved: r, evaluation, combinedRank };
        });

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

        const schemesPayload = finalTop.map((item, idx) => ({
          scheme: item.retrieved.scheme,
          citationId: citations[idx]?.id ?? `S${idx + 1}`,
          eligibility: item.evaluation,
        }));

        controller.enqueue(encodeSSE('schemes', { schemes: schemesPayload }));
        controller.enqueue(encodeSSE('citations', { citations }));

        // 8. Stream grounded answer (LLM or deterministic degraded mode)
        const provider = getLLMProvider();
        let usedDegradedMode = false;
        let fullAnswer = '';

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
              fullAnswer += chunk;
              controller.enqueue(encodeSSE('token', { text: chunk }));
            }
          } catch {
            usedDegradedMode = true;
          }
        } else {
          usedDegradedMode = true;
        }

        if (usedDegradedMode) {
          fullAnswer = buildDeterministicGroundedAnswer(evaluated, responseLang);
          const segments = fullAnswer.split(/(\s+)/);
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
            cached: false,
          })
        );

        // Save in LRU cache for identical subsequent queries
        const entry: CachedChatResponse = {
          lang: responseLang,
          isCodeMixed: detected.isCodeMixed,
          profile: mergedProfile as Record<string, unknown>,
          schemes: schemesPayload,
          citations,
          answerText: fullAnswer,
          followups,
          degradedMode: usedDegradedMode,
        };
        cache.set(cacheKey, entry);

        logStructured('info', 'chat_completed', {
          lang: responseLang,
          schemeCount: evaluated.length,
          degradedMode: usedDegradedMode,
          latencyMs: Date.now() - startTime,
        });
      } catch (err) {
        logStructured('error', 'chat_error', {
          errorCode: err instanceof Error ? err.name : 'unknown',
          latencyMs: Date.now() - startTime,
        });
        controller.enqueue(
          encodeSSE('error', {
            message: 'Unable to process your request right now. Please try again.',
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
      'X-Cache': 'MISS',
      'X-RateLimit-Remaining': String(rateDecision.remaining),
    },
  });
}
