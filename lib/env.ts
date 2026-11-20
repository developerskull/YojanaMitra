import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LLM_PROVIDER: z.enum(['gemini', 'openai', 'anthropic', 'none']).default('gemini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_FALLBACK_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-latest'),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(1000).default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
  CACHE_MAX_ENTRIES: z.coerce.number().int().min(10).max(10000).default(250),
  CACHE_TTL_MS: z.coerce.number().int().min(1000).max(86400000).default(300000),
  AUTH_SECRET: z.string().min(16).default('yojanamitra-dev-session-secret-change-in-prod'),
  ADMIN_EMAIL: z.string().email().default('admin@yojanamitra.in'),
  ADMIN_PASSWORD: z.string().min(6).default('Admin@1234'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

/**
 * Parses and validates runtime environment variables once via Zod.
 * Safe defaults ensure degraded no-LLM mode still boots cleanly without API keys.
 */
export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
