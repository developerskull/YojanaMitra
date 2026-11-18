import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getSchemeRepository } from '../lib/schemes/repository';
import { buildBM25Index } from '../lib/rag/bm25';
import { chunkScheme } from '../lib/rag/chunker';
import { embedTexts } from '../lib/rag/embedder';
import type { IndexedChunk, SerializedRagIndex } from '../lib/rag/index';

async function main() {
  const repo = getSchemeRepository();
  const schemes = repo.getAll();

  if (schemes.length === 0) {
    console.error('[build-index] ERROR: No schemes found in /data/schemes.');
    process.exit(1);
  }

  const allChunks = schemes.flatMap((scheme) => chunkScheme(scheme));
  const contentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(allChunks.map((c) => ({ id: c.chunkId, text: c.text }))))
    .digest('hex')
    .slice(0, 16);

  console.log(
    `[build-index] Chunked ${schemes.length} schemes into ${allChunks.length} section chunks (hash=${contentHash}).`
  );

  const { vectors, model } = await embedTexts(allChunks.map((c) => c.text));
  const indexedChunks: IndexedChunk[] = allChunks.map((chunk, idx) => ({
    ...chunk,
    embedding: vectors[idx] ?? [],
  }));

  const bm25 = buildBM25Index(allChunks.map((c) => ({ chunkId: c.chunkId, text: c.text })));

  const serialized: SerializedRagIndex = {
    version: '1.0.0',
    contentHash,
    builtAt: new Date().toISOString(),
    embeddingModel: model,
    embeddingDim: vectors[0]?.length ?? 0,
    schemeCount: schemes.length,
    chunks: indexedChunks,
    bm25,
  };

  const outDir = path.join(process.cwd(), 'data', 'embeddings');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.json');
  fs.writeFileSync(outPath, JSON.stringify(serialized), 'utf-8');

  const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
  console.log(
    `[build-index] Wrote ${outPath} (${sizeKB} KB, model=${model}, dim=${serialized.embeddingDim}).`
  );
}

main().catch((err) => {
  console.error('[build-index] Fatal error:', err);
  process.exit(1);
});
