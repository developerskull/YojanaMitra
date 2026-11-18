import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAllSchemes } from '@/lib/eligibility/engine';
import { getMissingWizardQuestions } from '@/lib/eligibility/wizard';
import { getSchemeRepository } from '@/lib/schemes/repository';
import { SupportedLangSchema, UserProfileSchema } from '@/lib/schemes/schema';

export const runtime = 'nodejs';

const EligibilityRequestSchema = z.object({
  profile: UserProfileSchema,
  lang: SupportedLangSchema.optional().default('en'),
  schemeIds: z.array(z.string()).max(60).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parsed = EligibilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid profile payload', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { profile, schemeIds } = parsed.data;
  const repo = getSchemeRepository();

  let targetSchemes = repo.getAll();
  if (schemeIds && schemeIds.length > 0) {
    const idSet = new Set(schemeIds);
    targetSchemes = targetSchemes.filter((s) => idSet.has(s.id));
  }

  const evaluated = evaluateAllSchemes(profile, targetSchemes);
  const missingQuestions = getMissingWizardQuestions(profile);

  const summary = {
    eligible: evaluated.filter((e) => e.evaluation.status === 'eligible').length,
    likely: evaluated.filter((e) => e.evaluation.status === 'likely').length,
    missing_info: evaluated.filter((e) => e.evaluation.status === 'missing_info').length,
    not_eligible: evaluated.filter((e) => e.evaluation.status === 'not_eligible').length,
  };

  return NextResponse.json({
    summary,
    results: evaluated,
    nextQuestions: missingQuestions,
    lastVerified: repo.getLatestVerificationDate(),
  });
}
