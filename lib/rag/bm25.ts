import { tokenizeMultilingual } from './embedder';

export interface BM25DocumentStats {
  chunkId: string;
  length: number;
  termFreqs: Record<string, number>;
}

export interface BM25Index {
  avgDocLength: number;
  docCount: number;
  idf: Record<string, number>;
  docs: Record<string, BM25DocumentStats>;
}

const K1 = 1.5;
const B = 0.75;

export function buildBM25Index(items: Array<{ chunkId: string; text: string }>): BM25Index {
  const docFreq: Record<string, number> = {};
  const docs: Record<string, BM25DocumentStats> = {};
  let totalLen = 0;

  for (const item of items) {
    const tokens = tokenizeMultilingual(item.text);
    const tf: Record<string, number> = {};
    for (const token of tokens) {
      tf[token] = (tf[token] ?? 0) + 1;
    }
    for (const uniqueTerm of Object.keys(tf)) {
      docFreq[uniqueTerm] = (docFreq[uniqueTerm] ?? 0) + 1;
    }
    docs[item.chunkId] = {
      chunkId: item.chunkId,
      length: tokens.length,
      termFreqs: tf,
    };
    totalLen += tokens.length;
  }

  const docCount = items.length || 1;
  const avgDocLength = totalLen / docCount || 1;
  const idf: Record<string, number> = {};

  for (const [term, df] of Object.entries(docFreq)) {
    // Standard Robertson/Sparck Jones BM25 IDF with smoothing
    idf[term] = Number(Math.log(1 + (docCount - df + 0.5) / (df + 0.5)).toFixed(5));
  }

  return { avgDocLength, docCount, idf, docs };
}

export function scoreBM25(
  query: string,
  index: BM25Index,
  allowedChunkIds?: Set<string>
): Array<{ chunkId: string; score: number }> {
  const queryTokens = tokenizeMultilingual(query);
  if (queryTokens.length === 0) return [];

  // Deduplicate query terms while preserving slight boost for repeated terms
  const queryTermWeights = new Map<string, number>();
  for (const t of queryTokens) {
    queryTermWeights.set(t, Math.min(2, (queryTermWeights.get(t) ?? 0) + 1));
  }

  const results: Array<{ chunkId: string; score: number }> = [];

  for (const [chunkId, doc] of Object.entries(index.docs)) {
    if (allowedChunkIds && !allowedChunkIds.has(chunkId)) continue;

    let score = 0;
    for (const [term, qWeight] of queryTermWeights.entries()) {
      const tf = doc.termFreqs[term];
      if (!tf) continue;
      const termIdf = index.idf[term] ?? 0;
      const denom = tf + K1 * (1 - B + B * (doc.length / index.avgDocLength));
      score += qWeight * termIdf * ((tf * (K1 + 1)) / denom);
    }

    if (score > 0) {
      results.push({ chunkId, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Reciprocal Rank Fusion (RRF) merging ranked lists from BM25 and dense vector search.
 */
export function reciprocalRankFusion(
  rankings: Array<Array<{ id: string; score: number }>>,
  k = 60
): Array<{ id: string; rrfScore: number }> {
  const fused = new Map<string, number>();

  for (const list of rankings) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      if (!item) continue;
      const contribution = 1 / (k + rank + 1);
      fused.set(item.id, (fused.get(item.id) ?? 0) + contribution);
    }
  }

  return Array.from(fused.entries())
    .map(([id, rrfScore]) => ({ id, rrfScore }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}
