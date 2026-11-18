import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildSessionCookieOptions,
  createSessionToken,
} from '@/lib/auth/session';
import { getUserStore } from '@/lib/auth/store';

export const runtime = 'nodejs';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4).max(128),
  role: z.enum(['user', 'admin']).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid email and password.' },
      { status: 400 }
    );
  }

  const { email, password, role } = parsed.data;
  const store = getUserStore();
  const user = store.findByEmail(email);

  if (!user || !store.verifyPassword(user, password)) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  if (role === 'admin' && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'This account does not have Administrator privileges.' },
      { status: 403 }
    );
  }

  const token = createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  res.cookies.set({
    ...buildSessionCookieOptions(),
    value: token,
  });

  return res;
}
