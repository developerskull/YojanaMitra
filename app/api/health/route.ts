import { NextResponse } from 'next/server';
import { getChatResponseCache } from '@/lib/cache/lru';
import { getLLMProvider } from '@/lib/llm/adapter';
import { getRagIndex } from '@/lib/rag';
import { getSchemeRepository } from '@/lib/schemes/repository';

export const runtime = 'nodejs';

export async function GET() {
  const repo = getSchemeRepository();
  const index = getRagIndex();
  const llm = getLLMProvider();
  const cacheStats = getChatResponseCache().stats();

  return NextResponse.json(
    {
      status: 'ok',
      stateless: true,
      database: 'none',
      schemes: {
        count: repo.getAll().length,
        lastVerified: repo.getLatestVerificationDate(),
      },
      ragIndex: {
        version: index.version,
        contentHash: index.contentHash,
        chunkCount: index.chunks.length,
        embeddingModel: index.embeddingModel,
      },
      llm: {
        provider: llm.name,
        configured: llm.isConfigured(),
        mode: llm.isConfigured() ? 'live' : 'degraded_deterministic',
      },
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
