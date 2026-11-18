import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildSessionCookieOptions,
  createSessionToken,
} from '@/lib/auth/session';
import { getUserStore } from '@/lib/auth/store';

export const runtime = 'nodejs';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid registration details' },
      { status: 400 }
    );
  }

  try {
    const store = getUserStore();
    const user = store.createCitizen(parsed.data);
    const token = createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    res.cookies.set({
      ...buildSessionCookieOptions(),
      value: token,
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to register account' },
      { status: 409 }
    );
  }
}
