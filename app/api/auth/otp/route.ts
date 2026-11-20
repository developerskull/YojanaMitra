import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  confirmRegistrationOtp,
  requestRegistrationOtp,
  resendRegistrationOtp,
} from '@/lib/auth/otp';
import { buildSessionCookieOptions, createSessionToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

const RequestOtpSchema = z.object({
  action: z.literal('request'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Enter a 10-digit mobile number').max(15),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const VerifyOtpSchema = z.object({
  action: z.literal('verify'),
  email: z.string().email('Please enter a valid email address'),
  code: z.string().min(4, 'Enter the verification code').max(8),
});

const ResendOtpSchema = z.object({
  action: z.literal('resend'),
  email: z.string().email('Please enter a valid email address'),
});

const CombinedSchema = z.discriminatedUnion('action', [
  RequestOtpSchema,
  VerifyOtpSchema,
  ResendOtpSchema,
]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
  }

  const parsed = CombinedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request parameters' },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // 1. ACTION: REQUEST OTP
  if (payload.action === 'request') {
    const result = await requestRegistrationOtp({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? `Verification code sent to ${payload.email} and mobile`,
      demoOtp: result.demoOtp,
      phone: result.phone,
    });
  }

  // 2. ACTION: RESEND OTP
  if (payload.action === 'resend') {
    const result = await resendRegistrationOtp(payload.email);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? `Fresh verification code sent to ${payload.email} and mobile`,
      demoOtp: result.demoOtp,
      phone: result.phone,
    });
  }

  // 3. ACTION: VERIFY OTP
  if (payload.action === 'verify') {
    const result = confirmRegistrationOtp(payload.email, payload.code);
    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const user = result.user;
    const token = createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json(
      {
        success: true,
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
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
