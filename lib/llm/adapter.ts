import { z } from 'zod';
import { getEnv, type AppEnv } from '@/lib/env';
import type { LLMGenerateOptions, LLMProvider, LLMProviderName } from './types';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetries<T>(
  fn: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const backoff = Math.min(3000, 350 * Math.pow(2, attempt));
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw.trim();
}

class GeminiProvider implements LLMProvider {
  readonly name: LLMProviderName = 'gemini';
  constructor(private readonly env: AppEnv) {}

  isConfigured(): boolean {
    return Boolean(this.env.GEMINI_API_KEY && this.env.GEMINI_API_KEY.trim().length > 0);
  }

  private buildBody(options: LLMGenerateOptions, forceJson = false) {
    const systemMsg = options.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const contents = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    return {
      ...(systemMsg
        ? { systemInstruction: { parts: [{ text: systemMsg }] } }
        : {}),
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 4096,
        ...(forceJson ? { responseMimeType: 'application/json' } : {}),
        // For Gemini 2.5 Flash thinking models, dedicate token budget to response text
        // so Hindi/Marathi generations never hit MAX_TOKENS mid-sentence
        thinkingConfig: {
          thinkingBudget: options.thinkingBudget ?? 0,
        },
      },
    };
  }

  private async callModel(
    model: string,
    options: LLMGenerateOptions,
    forceJson = false
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(this.env.GEMINI_API_KEY)}`;

    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildBody(options, forceJson)),
      },
      this.env.LLM_TIMEOUT_MS
    );

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned empty text');
    return text;
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    if (!this.isConfigured()) throw new Error('Gemini API key not configured');
    const primary = options.modelOverride ?? this.env.GEMINI_MODEL;
    try {
      return await withRetries(() => this.callModel(primary, options), this.env.LLM_MAX_RETRIES);
    } catch {
      if (this.env.GEMINI_FALLBACK_MODEL && this.env.GEMINI_FALLBACK_MODEL !== primary) {
        return await this.callModel(this.env.GEMINI_FALLBACK_MODEL, options);
      }
      throw new Error('Gemini primary and fallback models failed');
    }
  }

  async generateJSON<T>(options: LLMGenerateOptions, schema: z.ZodType<T>): Promise<T | null> {
    if (!this.isConfigured()) return null;
    try {
      const raw = await withRetries(
        () => this.callModel(options.modelOverride ?? this.env.GEMINI_MODEL, options, true),
        1
      );
      const parsed = JSON.parse(extractJsonBlock(raw));
      const validated = schema.safeParse(parsed);
      return validated.success ? validated.data : null;
    } catch {
      return null;
    }
  }

  async *streamText(options: LLMGenerateOptions): AsyncIterable<string> {
    if (!this.isConfigured()) throw new Error('Gemini API key not configured');
    const model = options.modelOverride ?? this.env.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.env.GEMINI_API_KEY)}`;

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.buildBody(options, false)),
        },
        this.env.LLM_TIMEOUT_MS
      );

      if (!res.ok || !res.body) {
        throw new Error(`Gemini stream HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const chunk =
              parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
            if (chunk) yield chunk;
          } catch {
            // Skip malformed SSE line
          }
        }
      }
    } catch {
      // Fallback to non-streaming call (with secondary model fallback)
      const full = await this.generateText(options);
      yield full;
    }
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    if (!this.isConfigured() || texts.length === 0) return null;
    const model = this.env.GEMINI_EMBEDDING_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:batchEmbedContents?key=${encodeURIComponent(this.env.GEMINI_API_KEY)}`;

    const results: number[][] = [];
    const batchSize = 50;

    try {
      for (let i = 0; i < texts.length; i += batchSize) {
        const slice = texts.slice(i, i + batchSize);
        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: slice.map((text) => ({
                model: `models/${model}`,
                content: { parts: [{ text }] },
              })),
            }),
          },
          this.env.LLM_TIMEOUT_MS
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          embeddings?: Array<{ values?: number[] }>;
        };
        if (!data.embeddings || data.embeddings.length !== slice.length) return null;
        for (const emb of data.embeddings) {
          if (!emb.values) return null;
          results.push(emb.values);
        }
      }
      return results;
    } catch {
      return null;
    }
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  readonly name: LLMProviderName = 'openai';
  constructor(private readonly env: AppEnv) {}

  isConfigured(): boolean {
    return Boolean(this.env.OPENAI_API_KEY && this.env.OPENAI_API_KEY.trim().length > 0);
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    if (!this.isConfigured()) throw new Error('OpenAI API key not configured');
    const call = async (model: string) => {
      const res = await fetchWithTimeout(
        `${this.env.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            temperature: options.temperature ?? 0.2,
            max_tokens: options.maxTokens ?? 1024,
          }),
        },
        this.env.LLM_TIMEOUT_MS
      );
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('OpenAI returned empty text');
      return text;
    };

    const primary = options.modelOverride ?? this.env.OPENAI_MODEL;
    try {
      return await withRetries(() => call(primary), this.env.LLM_MAX_RETRIES);
    } catch {
      return await call(this.env.OPENAI_FALLBACK_MODEL);
    }
  }

  async generateJSON<T>(options: LLMGenerateOptions, schema: z.ZodType<T>): Promise<T | null> {
    if (!this.isConfigured()) return null;
    try {
      const raw = await this.generateText({ ...options, temperature: 0 });
      const validated = schema.safeParse(JSON.parse(extractJsonBlock(raw)));
      return validated.success ? validated.data : null;
    } catch {
      return null;
    }
  }

  async *streamText(options: LLMGenerateOptions): AsyncIterable<string> {
    const full = await this.generateText(options);
    const words = full.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 4) {
      yield words.slice(i, i + 4).join('');
    }
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    if (!this.isConfigured() || texts.length === 0) return null;
    try {
      const res = await fetchWithTimeout(
        `${this.env.OPENAI_BASE_URL.replace(/\/$/, '')}/embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: this.env.OPENAI_EMBEDDING_MODEL,
            input: texts,
          }),
        },
        this.env.LLM_TIMEOUT_MS
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
      return data.data?.map((d) => d.embedding) ?? null;
    } catch {
      return null;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  readonly name: LLMProviderName = 'anthropic';
  constructor(private readonly env: AppEnv) {}

  isConfigured(): boolean {
    return Boolean(this.env.ANTHROPIC_API_KEY && this.env.ANTHROPIC_API_KEY.trim().length > 0);
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    if (!this.isConfigured()) throw new Error('Anthropic API key not configured');
    const system = options.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.modelOverride ?? this.env.ANTHROPIC_MODEL,
          system,
          messages,
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.2,
        }),
      },
      this.env.LLM_TIMEOUT_MS
    );
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
    if (!text) throw new Error('Anthropic returned empty text');
    return text;
  }

  async generateJSON<T>(options: LLMGenerateOptions, schema: z.ZodType<T>): Promise<T | null> {
    if (!this.isConfigured()) return null;
    try {
      const raw = await this.generateText({ ...options, temperature: 0 });
      const validated = schema.safeParse(JSON.parse(extractJsonBlock(raw)));
      return validated.success ? validated.data : null;
    } catch {
      return null;
    }
  }

  async *streamText(options: LLMGenerateOptions): AsyncIterable<string> {
    const full = await this.generateText(options);
    yield full;
  }

  async embed(): Promise<number[][] | null> {
    return null;
  }
}

class NoopDegradedProvider implements LLMProvider {
  readonly name: LLMProviderName = 'none';
  isConfigured(): boolean {
    return false;
  }
  async generateText(): Promise<string> {
    throw new Error('LLM disabled (degraded deterministic mode)');
  }
  async generateJSON<T>(): Promise<T | null> {
    return null;
  }
  async *streamText(): AsyncIterable<string> {
    throw new Error('LLM disabled (degraded deterministic mode)');
  }
  async embed(): Promise<number[][] | null> {
    return null;
  }
}

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;
  const env = getEnv();
  switch (env.LLM_PROVIDER) {
    case 'gemini':
      cachedProvider = new GeminiProvider(env);
      break;
    case 'openai':
      cachedProvider = new OpenAICompatibleProvider(env);
      break;
    case 'anthropic':
      cachedProvider = new AnthropicProvider(env);
      break;
    default:
      cachedProvider = new NoopDegradedProvider();
  }
  return cachedProvider;
}

export function resetLLMProviderForTests(): void {
  cachedProvider = null;
}
