import fs from 'node:fs';
import path from 'node:path';
import { getSchemeRepository } from '@/lib/schemes/repository';
import type { Scheme, SchemeCategory, SupportedLang, UserProfile } from '@/lib/schemes/schema';
import { buildBM25Index, reciprocalRankFusion, scoreBM25, type BM25Index } from './bm25';
import { chunkScheme, type SchemeChunk } from './chunker';
import { computeLocalEmbedding, cosineSimilarity, embedTexts } from './embedder';

export interface IndexedChunk extends SchemeChunk {
  embedding: number[];
}

export interface SerializedRagIndex {
  version: string;
  contentHash: string;
  builtAt: string;
  embeddingModel: string;
  embeddingDim: number;
  schemeCount: number;
  chunks: IndexedChunk[];
  bm25: BM25Index;
}

export interface SearchMetadataFilter {
  state?: string;
  category?: SchemeCategory;
}

export interface RetrievedSchemeResult {
  scheme: Scheme;
  rrfScore: number;
  vectorScore: number;
  bm25Score: number;
  topChunks: Array<{
    chunk: SchemeChunk;
    score: number;
  }>;
}

export interface CitationItem {
  id: string; // "S1", "S2", ...
  schemeId: string;
  schemeName: string;
  section: SchemeChunk['section'];
  snippet: string;
  officialUrl: string;
  sourceUrl: string;
  lastVerified: string;
}

let cachedIndex: SerializedRagIndex | null = null;

/**
 * Loads /data/embeddings/index.json once into module-level memory.
 * If the prebuilt index file is absent (e.g., fresh unit test), builds a local
 * in-memory index on the fly from /data/schemes/*.json.
 */
export function getRagIndex(): SerializedRagIndex {
  if (cachedIndex) return cachedIndex;

  const indexPath = path.join(process.cwd(), 'data', 'embeddings', 'index.json');
  if (fs.existsSync(indexPath)) {
    const raw = fs.readFileSync(indexPath, 'utf-8');
    cachedIndex = JSON.parse(raw) as SerializedRagIndex;
    return cachedIndex;
  }

  // On-the-fly fallback for test environments before build-index has run
  const schemes = getSchemeRepository().getAll();
  const chunks: IndexedChunk[] = [];
  for (const scheme of schemes) {
    for (const chunk of chunkScheme(scheme)) {
      chunks.push({
        ...chunk,
        embedding: computeLocalEmbedding(chunk.text),
      });
    }
  }
  cachedIndex = {
    version: '1.0.0-memory',
    contentHash: 'in-memory',
    builtAt: new Date().toISOString(),
    embeddingModel: 'local-multilingual-hash-256',
    embeddingDim: 256,
    schemeCount: schemes.length,
    chunks,
    bm25: buildBM25Index(chunks.map((c) => ({ chunkId: c.chunkId, text: c.text }))),
  };
  return cachedIndex;
}

export function resetRagIndexForTests(): void {
  cachedIndex = null;
}

/**
 * Expands a user query with structured profile hints so hybrid retrieval works well
 * even when the user gives short or conversational inputs.
 */
export function buildEnrichedQuery(rawQuery: string, profile?: UserProfile): string {
  if (!profile) return rawQuery;
  const parts: string[] = [rawQuery];
  if (profile.occupation) parts.push(profile.occupation.replace('_', ' '));
  if (profile.state) parts.push(profile.state);
  if (profile.gender === 'female') parts.push('woman mahila');
  if (profile.age !== undefined && profile.age >= 60) parts.push('senior citizen pension');
  if (profile.hasDisability) parts.push('disabled divyang udid');
  if (profile.casteCategory) parts.push(profile.casteCategory);
  if (profile.isBpl) parts.push('bpl');
  if (profile.maritalStatus === 'widowed') parts.push('widow');
  if (profile.isPregnantOrLactating) parts.push('pregnant maternity');
  if (profile.hasGirlChild) parts.push('girl child sukanya');
  return parts.join(' ');
}

/**
 * Hybrid search: metadata pre-filter -> BM25 keyword scoring + dense vector cosine similarity
 * -> Reciprocal Rank Fusion (RRF) -> scheme-level grouping.
 */
export async function hybridSearchSchemes(
  rawQuery: string,
  options?: {
    filter?: SearchMetadataFilter;
    profile?: UserProfile;
    topK?: number;
  }
): Promise<RetrievedSchemeResult[]> {
  const index = getRagIndex();
  const repo = getSchemeRepository();
  const topK = options?.topK ?? 8;
  const filter = options?.filter;

  // 1. Metadata pre-filter (state allows Central + matching State; category checks primary/secondary)
  const allowedChunks = index.chunks.filter((chunk) => {
    if (filter?.state && filter.state !== 'All India') {
      const target = filter.state.trim().toLowerCase();
      const isCentral = chunk.level === 'central' || chunk.state.toLowerCase() === 'all india';
      const isSameState = chunk.state.toLowerCase() === target;
      if (!isCentral && !isSameState) return false;
    }
    if (filter?.category) {
      const matchPrimary = chunk.category === filter.category;
      const matchSecondary = chunk.secondaryCategories.includes(filter.category);
      if (!matchPrimary && !matchSecondary) return false;
    }
    return true;
  });

  if (allowedChunks.length === 0) return [];

  const allowedSet = new Set(allowedChunks.map((c) => c.chunkId));
  const chunkMap = new Map(allowedChunks.map((c) => [c.chunkId, c]));
  const enrichedQuery = buildEnrichedQuery(rawQuery, options?.profile);

  // 2. BM25 keyword ranking
  const bm25Ranked = scoreBM25(enrichedQuery, index.bm25, allowedSet);
  const bm25ScoreMap = new Map(bm25Ranked.map((r) => [r.chunkId, r.score]));

  // 3. Dense vector similarity ranking
  const { vectors } = await embedTexts([enrichedQuery], index.embeddingModel);
  const queryVec = vectors[0] ?? computeLocalEmbedding(enrichedQuery);

  const vectorRanked: Array<{ id: string; score: number }> = [];
  const vectorScoreMap = new Map<string, number>();

  for (const chunk of allowedChunks) {
    // Only compute cosine if dimensions match (protects against mismatched remote/local index)
    const score =
      chunk.embedding.length === queryVec.length
        ? cosineSimilarity(queryVec, chunk.embedding)
        : cosineSimilarity(computeLocalEmbedding(enrichedQuery), computeLocalEmbedding(chunk.text));
    vectorScoreMap.set(chunk.chunkId, score);
    if (score > 0.04) {
      vectorRanked.push({ id: chunk.chunkId, score });
    }
  }
  vectorRanked.sort((a, b) => b.score - a.score);

  // 4. Reciprocal Rank Fusion (RRF)
  const fused = reciprocalRankFusion(
    [
      bm25Ranked.slice(0, 60).map((r) => ({ id: r.chunkId, score: r.score })),
      vectorRanked.slice(0, 60),
    ],
    60
  );

  // 5. Group top chunks by schemeId
  const schemeGroups = new Map<
    string,
    {
      scheme: Scheme;
      rrfScore: number;
      vectorScore: number;
      bm25Score: number;
      topChunks: Array<{ chunk: SchemeChunk; score: number }>;
    }
  >();

  for (const item of fused) {
    const chunk = chunkMap.get(item.id);
    if (!chunk) continue;
    const scheme = repo.getById(chunk.schemeId);
    if (!scheme) continue;

    const vScore = vectorScoreMap.get(item.id) ?? 0;
    const bScore = bm25ScoreMap.get(item.id) ?? 0;

    // Slight boost for exact state match (e.g. Maharashtra schemes for a Nashik farmer)
    let stateBoost = 1.0;
    if (
      options?.profile?.state &&
      scheme.level === 'state' &&
      scheme.state.toLowerCase() === options.profile.state.toLowerCase()
    ) {
      stateBoost = 1.15;
    }

    const existing = schemeGroups.get(scheme.id);
    if (!existing) {
      schemeGroups.set(scheme.id, {
        scheme,
        rrfScore: item.rrfScore * stateBoost,
        vectorScore: vScore,
        bm25Score: bScore,
        topChunks: [{ chunk, score: item.rrfScore }],
      });
    } else {
      // Accumulate diminishing credit from multiple matching sections of the same scheme
      existing.rrfScore += item.rrfScore * 0.25 * stateBoost;
      existing.vectorScore = Math.max(existing.vectorScore, vScore);
      existing.bm25Score = Math.max(existing.bm25Score, bScore);
      if (existing.topChunks.length < 3) {
        existing.topChunks.push({ chunk, score: item.rrfScore });
      }
    }
  }

  return Array.from(schemeGroups.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK);
}

/**
 * Converts ranked scheme candidates into numbered citation items [S1], [S2], ...
 */
export function buildCitations(
  schemes: Array<{ scheme: Scheme; topChunks?: Array<{ chunk: SchemeChunk }> }>,
  lang: SupportedLang
): CitationItem[] {
  const citations: CitationItem[] = [];
  let counter = 1;

  for (const entry of schemes) {
    const scheme = entry.scheme;
    const preferredChunk = entry.topChunks?.[0]?.chunk;
    const snippet = preferredChunk
      ? preferredChunk.snippet[lang]
      : `${scheme.name[lang]}: ${scheme.benefits[lang]}`;

    citations.push({
      id: `S${counter}`,
      schemeId: scheme.id,
      schemeName: scheme.name[lang],
      section: preferredChunk?.section ?? 'overview_benefits',
      snippet,
      officialUrl: scheme.officialUrl,
      sourceUrl: scheme.sourceUrls[0] ?? scheme.officialUrl,
      lastVerified: scheme.lastVerified,
    });
    counter += 1;
  }

  return citations;
}
