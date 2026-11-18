import { NextResponse } from 'next/server';
import { buildSessionCookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    ...buildSessionCookieOptions(0),
    value: '',
  });
  return res;
}
