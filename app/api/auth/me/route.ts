import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(
    {
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
