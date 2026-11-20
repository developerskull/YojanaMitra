import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

let cachedServerClient: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client with admin privileges (Service Role),
 * or null if Supabase environment variables are not configured.
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (cachedServerClient) return cachedServerClient;

  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    cachedServerClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedServerClient;
  } catch (err) {
    console.error('Failed to initialize Supabase server client:', err);
    return null;
  }
}

/**
 * Helper to check whether Supabase is configured and active.
 */
export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}
