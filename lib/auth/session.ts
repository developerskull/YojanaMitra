import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';

export type UserRole = 'user' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'yojanamitra_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function sign(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createSessionToken(user: Omit<SessionUser, 'exp'>): string {
  const secret = getEnv().AUTH_SECRET;
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const secret = getEnv().AUTH_SECRET;
  const expected = sign(encoded, secret);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as SessionUser;
    if (!parsed.id || !parsed.email || !parsed.role || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function buildSessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
