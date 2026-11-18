import type { Scheme, SchemeCategory } from '@/lib/schemes/schema';

export type ChunkSection =
  | 'overview_benefits'
  | 'eligibility'
  | 'documents'
  | 'application_steps'
  | 'helpline_deadlines';

export interface SchemeChunk {
  chunkId: string;
  schemeId: string;
  section: ChunkSection;
  category: SchemeCategory;
  secondaryCategories: SchemeCategory[];
  level: 'central' | 'state';
  state: string;
  officialUrl: string;
  sourceUrl: string;
  lastVerified: string;
  /** Multilingual searchable content used for embedding & BM25 */
  text: string;
  /** Concise localized snippets for displaying in citation chips */
  snippet: {
    en: string;
    hi: string;
    mr: string;
  };
}

/**
 * Chunks a single scheme into semantic sections across EN/HI/MR so retrieval
 * can pinpoint exact passages (benefits, eligibility, documents, steps, deadlines)
 * and ground every citation [S1], [S2] in verifiable text.
 */
export function chunkScheme(scheme: Scheme): SchemeChunk[] {
  const base = {
    schemeId: scheme.id,
    category: scheme.category,
    secondaryCategories: scheme.secondaryCategories,
    level: scheme.level,
    state: scheme.state,
    officialUrl: scheme.officialUrl,
    sourceUrl: scheme.sourceUrls[0] ?? scheme.officialUrl,
    lastVerified: scheme.lastVerified,
  };

  const tagString = scheme.tags.join(' ');
  const nameLine = `${scheme.name.en} | ${scheme.name.hi} | ${scheme.name.mr}`;

  // 1. Overview & Benefits
  const overviewChunk: SchemeChunk = {
    ...base,
    chunkId: `${scheme.id}#overview_benefits`,
    section: 'overview_benefits',
    text: [
      nameLine,
      `State: ${scheme.state} | Level: ${scheme.level} | Category: ${scheme.category} ${scheme.secondaryCategories.join(' ')} | Ministry: ${scheme.ministry}`,
      `Summary EN: ${scheme.summary.en}`,
      `Summary HI: ${scheme.summary.hi}`,
      `Summary MR: ${scheme.summary.mr}`,
      `Benefits EN: ${scheme.benefits.en}`,
      `Benefits HI: ${scheme.benefits.hi}`,
      `Benefits MR: ${scheme.benefits.mr}`,
      `Tags: ${tagString}`,
    ].join('\n'),
    snippet: {
      en: `${scheme.name.en}: ${scheme.benefits.en}`,
      hi: `${scheme.name.hi}: ${scheme.benefits.hi}`,
      mr: `${scheme.name.mr}: ${scheme.benefits.mr}`,
    },
  };

  // 2. Eligibility
  const eligPartsEn: string[] = [];
  const eligPartsHi: string[] = [];
  const eligPartsMr: string[] = [];
  const e = scheme.eligibility;

  if (e.minAge !== undefined || e.maxAge !== undefined) {
    eligPartsEn.push(`Age: ${e.minAge ?? 0}–${e.maxAge ?? 'any'} years`);
    eligPartsHi.push(`आयु: ${e.minAge ?? 0}–${e.maxAge ?? 'कोई सीमा नहीं'} वर्ष`);
    eligPartsMr.push(`वय: ${e.minAge ?? 0}–${e.maxAge ?? 'मर्यादा नाही'} वर्षे`);
  }
  if (e.maxAnnualIncome !== undefined) {
    eligPartsEn.push(`Max annual income: ₹${e.maxAnnualIncome.toLocaleString('en-IN')}`);
    eligPartsHi.push(`अधिकतम वार्षिक आय: ₹${e.maxAnnualIncome.toLocaleString('en-IN')}`);
    eligPartsMr.push(`कमाल वार्षिक उत्पन्न: ₹${e.maxAnnualIncome.toLocaleString('en-IN')}`);
  }
  if (e.states?.length) {
    eligPartsEn.push(`States: ${e.states.join(', ')}`);
    eligPartsHi.push(`राज्य: ${e.states.join(', ')}`);
    eligPartsMr.push(`राज्य: ${e.states.join(', ')}`);
  }
  if (e.occupations?.length) {
    eligPartsEn.push(`Occupations: ${e.occupations.join(', ')}`);
  }
  if (e.casteCategories?.length) {
    eligPartsEn.push(`Categories: ${e.casteCategories.join(', ')}`);
  }
  if (e.disabilityRequired) {
    eligPartsEn.push(`Disability required (min ${e.minDisabilityPercent ?? 40}%)`);
  }
  if (e.bplRequired) {
    eligPartsEn.push('BPL / SECC household required');
  }
  for (const cond of e.customConditions ?? []) {
    eligPartsEn.push(cond.en);
    eligPartsHi.push(cond.hi);
    eligPartsMr.push(cond.mr);
  }

  const eligibilityChunk: SchemeChunk = {
    ...base,
    chunkId: `${scheme.id}#eligibility`,
    section: 'eligibility',
    text: [
      nameLine,
      `Eligibility EN: ${eligPartsEn.join(' | ')}`,
      `Eligibility HI: ${eligPartsHi.join(' | ')}`,
      `Eligibility MR: ${eligPartsMr.join(' | ')}`,
      `Tags: ${tagString}`,
    ].join('\n'),
    snippet: {
      en: `${scheme.name.en} Eligibility: ${eligPartsEn.join('. ')}`,
      hi: `${scheme.name.hi} पात्रता: ${eligPartsHi.join('। ') || eligPartsEn.join('. ')}`,
      mr: `${scheme.name.mr} पात्रता: ${eligPartsMr.join('. ') || eligPartsEn.join('. ')}`,
    },
  };

  // 3. Documents
  const docsEn = scheme.documents.map((d) => d.name.en).join(', ');
  const docsHi = scheme.documents.map((d) => d.name.hi).join(', ');
  const docsMr = scheme.documents.map((d) => d.name.mr).join(', ');

  const documentsChunk: SchemeChunk = {
    ...base,
    chunkId: `${scheme.id}#documents`,
    section: 'documents',
    text: [
      nameLine,
      `Required Documents EN: ${docsEn}`,
      `आवश्यक दस्तावेज HI: ${docsHi}`,
      `आवश्यक कागदपत्रे MR: ${docsMr}`,
    ].join('\n'),
    snippet: {
      en: `${scheme.name.en} Documents: ${docsEn}`,
      hi: `${scheme.name.hi} आवश्यक दस्तावेज: ${docsHi}`,
      mr: `${scheme.name.mr} आवश्यक कागदपत्रे: ${docsMr}`,
    },
  };

  // 4. Application Steps
  const stepsChunk: SchemeChunk = {
    ...base,
    chunkId: `${scheme.id}#application_steps`,
    section: 'application_steps',
    text: [
      nameLine,
      `How to apply EN: ${scheme.applicationSteps.en.join(' ')}`,
      `आवेदन कैसे करें HI: ${scheme.applicationSteps.hi.join(' ')}`,
      `अर्ज कसा करावा MR: ${scheme.applicationSteps.mr.join(' ')}`,
      `Official URL: ${scheme.officialUrl}`,
    ].join('\n'),
    snippet: {
      en: `${scheme.name.en} Application: ${scheme.applicationSteps.en.slice(0, 2).join(' ')} (${scheme.officialUrl})`,
      hi: `${scheme.name.hi} आवेदन: ${scheme.applicationSteps.hi.slice(0, 2).join(' ')} (${scheme.officialUrl})`,
      mr: `${scheme.name.mr} अर्ज प्रक्रिया: ${scheme.applicationSteps.mr.slice(0, 2).join(' ')} (${scheme.officialUrl})`,
    },
  };

  // 5. Helpline & Deadlines
  const helplineChunk: SchemeChunk = {
    ...base,
    chunkId: `${scheme.id}#helpline_deadlines`,
    section: 'helpline_deadlines',
    text: [
      nameLine,
      `Deadlines EN: ${scheme.deadlines.en}`,
      `अंतिम तिथि HI: ${scheme.deadlines.hi}`,
      `अंतिम मुदत MR: ${scheme.deadlines.mr}`,
      `Helpline: ${scheme.helpline} | Official URL: ${scheme.officialUrl}`,
    ].join('\n'),
    snippet: {
      en: `${scheme.name.en} — Deadlines: ${scheme.deadlines.en} | Helpline: ${scheme.helpline}`,
      hi: `${scheme.name.hi} — अंतिम तिथि: ${scheme.deadlines.hi} | हेल्पलाइन: ${scheme.helpline}`,
      mr: `${scheme.name.mr} — मुदत: ${scheme.deadlines.mr} | हेल्पलाईन: ${scheme.helpline}`,
    },
  };

  return [overviewChunk, eligibilityChunk, documentsChunk, stepsChunk, helplineChunk];
}
