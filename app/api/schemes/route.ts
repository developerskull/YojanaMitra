import { NextRequest, NextResponse } from 'next/server';
import { getSchemeRepository } from '@/lib/schemes/repository';
import { BenefitTypeSchema, SchemeCategorySchema } from '@/lib/schemes/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state') ?? undefined;
  const rawCategory = searchParams.get('category');
  const rawBenefit = searchParams.get('benefitType');
  const rawLevel = searchParams.get('level');

  const category = rawCategory ? SchemeCategorySchema.safeParse(rawCategory).data : undefined;
  const benefitType = rawBenefit ? BenefitTypeSchema.safeParse(rawBenefit).data : undefined;
  const level = rawLevel === 'central' || rawLevel === 'state' ? rawLevel : undefined;

  const repo = getSchemeRepository();
  const schemes = repo.filter({ state, category, benefitType, level });

  return NextResponse.json(
    {
      count: schemes.length,
      lastVerified: repo.getLatestVerificationDate(),
      schemes,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
