import { NextRequest, NextResponse } from 'next/server';
import { cleanTextForSpeech } from '@/lib/voice/utils';

export const runtime = 'nodejs';

function splitIntoTTSChunks(text: string, maxLen = 180): string[] {
  const rawSentences = text.split(/([।\n\r.!?]+)/).filter(Boolean);
  const pieces: string[] = [];
  for (let i = 0; i < rawSentences.length; i += 2) {
    const s = (rawSentences[i] || '') + (rawSentences[i + 1] || '');
    if (s.trim()) pieces.push(s.trim());
  }

  const chunks: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= maxLen) {
      chunks.push(piece);
    } else {
      const subPieces = piece.split(/([,;]+|\s{2,})/);
      let cur = '';
      for (const sub of subPieces) {
        if ((cur + ' ' + sub).trim().length <= maxLen) {
          cur = (cur + ' ' + sub).trim();
        } else {
          if (cur) chunks.push(cur);
          cur = sub.trim();
        }
      }
      if (cur) chunks.push(cur);
    }
  }
  return chunks.filter((c) => c.length > 0);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawText = searchParams.get('text') ?? '';
  const lang = searchParams.get('lang') ?? 'mr';

  return handleTTS(rawText, lang);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string; lang?: string };
    const rawText = body.text ?? '';
    const lang = body.lang ?? 'mr';
    return handleTTS(rawText, lang);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
  }
}

async function handleTTS(rawText: string, lang: string) {
  const clean = cleanTextForSpeech(rawText);
  if (!clean) {
    return NextResponse.json({ error: 'No text provided for speech' }, { status: 400 });
  }

  // Supported Indic and English target language codes
  const validLang = lang === 'hi' ? 'hi' : lang === 'en' ? 'en' : 'mr';

  // Cap at ~1500 chars for responsive streaming TTS
  const trimmed = clean.slice(0, 1500);
  const chunks = splitIntoTTSChunks(trimmed, 175);

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'Empty text chunks' }, { status: 400 });
  }

  try {
    // Fetch all audio chunks concurrently (up to 8 chunks)
    const activeChunks = chunks.slice(0, 8);
    const audioPromises = activeChunks.map(async (chunk) => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=${validLang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) {
        throw new Error(`TTS provider returned HTTP ${res.status}`);
      }
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    });

    const buffers = await Promise.all(audioPromises);
    const merged = Buffer.concat(buffers);

    return new NextResponse(merged, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Length': String(merged.length),
      },
    });
  } catch (err) {
    console.error('[API/TTS ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to synthesize speech audio' },
      { status: 502 }
    );
  }
}
