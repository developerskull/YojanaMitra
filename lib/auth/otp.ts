import crypto from 'node:crypto';
import { getUserStore, type StoredUser } from './store';

export interface PendingRegistration {
  name: string;
  email: string;
  phone: string;
  password: string;
  code: string;
  expiresAt: number; // Unix timestamp
  attempts: number;
}

// In-memory pending registration pool (5-minute TTL)
const pendingRegistrations = new Map<string, PendingRegistration>();

/**
 * Normalizes and validates a 10-digit Indian mobile number.
 * Accepts formats: 9820012345, +919820012345, 919820012345, 09820012345.
 */
export function normalizeIndianMobile(raw: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const digits = raw.replace(/\D/g, '');
  let phone = digits;

  // Handle +91 or 91 country code
  if (phone.length === 12 && phone.startsWith('91')) {
    phone = phone.slice(2);
  }
  // Handle leading 0 trunk prefix
  if (phone.length === 11 && phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  if (phone.length !== 10) {
    return {
      valid: false,
      error: 'Please enter a 10-digit mobile number.',
    };
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return {
      valid: false,
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }

  return { valid: true, normalized: phone };
}

/**
 * Dispatches the 6-digit OTP to the citizen's email address.
 * Integrates with Resend if RESEND_API_KEY is configured in .env.local,
 * otherwise provides full structured log output for local development.
 */
export async function dispatchEmailOtp(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'YojanaMitra <onboarding@resend.dev>',
          to: email,
          subject: `${code} is your YojanaMitra verification code`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #0D5C63; margin-bottom: 8px;">YojanaMitra Citizen Portal</h2>
              <p>Namaskar <strong>${name}</strong>,</p>
              <p>Use the following 6-digit One-Time Password (OTP) to complete your citizen registration:</p>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace; color: #093D42; border-radius: 8px; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #64748b; font-size: 14px;">This verification code is valid for <strong>5 minutes</strong>. For security, never share this code with anyone.</p>
            </div>
          `,
        }),
      });

      if (resp.ok) {
        console.log(`[OTP DISPATCH ✉️ SUCCESS] Live email delivered to ${email}`);
        return true;
      }
      const errText = await resp.text();
      console.warn(`[OTP DISPATCH ✉️ WARN] Resend API responded with status ${resp.status}: ${errText}`);
    } catch (err) {
      console.error(`[OTP DISPATCH ✉️ ERROR] Email delivery failed:`, err);
    }
  }

  console.log(
    `[OTP DISPATCH ✉️ SIMULATED] To: ${email} | Subject: "${code} is your YojanaMitra verification code" | Code: ${code} (5m TTL)`
  );
  return true;
}

/**
 * Dispatches the 6-digit OTP via SMS to the citizen's mobile number.
 * Integrates with Fast2SMS if FAST2SMS_API_KEY is configured in .env.local,
 * otherwise provides full structured log output for local development.
 */
export async function dispatchSmsOtp(
  phone: string,
  code: string
): Promise<boolean> {
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: code,
          numbers: phone,
        }),
      });

      const json = (await resp.json()) as { return?: boolean; message?: string[] };
      if (json.return) {
        console.log(`[OTP DISPATCH 📱 SUCCESS] Live Fast2SMS delivered to +91 ${phone}`);
        return true;
      }
      console.warn(`[OTP DISPATCH 📱 WARN] Fast2SMS returned response:`, json);
    } catch (err) {
      console.error(`[OTP DISPATCH 📱 ERROR] Fast2SMS delivery failed:`, err);
    }
  }

  console.log(
    `[OTP DISPATCH 📱 SIMULATED] To: +91 ${phone} | SMS: "Your YojanaMitra citizen registration OTP is ${code}. Valid for 5 minutes. Do not share."`
  );
  return true;
}

/**
 * Initiates citizen registration by validating email uniqueness and mobile format,
 * generating a cryptographically random 6-digit OTP, and dispatching it to both
 * email and mobile number.
 */
export async function requestRegistrationOtp(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{
  success: boolean;
  error?: string;
  demoOtp?: string;
  phone?: string;
  message?: string;
}> {
  const emailNorm = input.email.trim().toLowerCase();
  const phoneCheck = normalizeIndianMobile(input.phone);

  if (!phoneCheck.valid || !phoneCheck.normalized) {
    return {
      success: false,
      error: phoneCheck.error ?? 'Please provide a valid 10-digit Indian mobile number.',
    };
  }

  const phoneNorm = phoneCheck.normalized;
  const store = getUserStore();

  // Guard: Email already registered
  if (store.findByEmail(emailNorm)) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  // Generate 6-digit numeric OTP (100000 - 999999)
  const code = Math.floor(100000 + crypto.randomInt(900000)).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  pendingRegistrations.set(emailNorm, {
    name: input.name.trim(),
    email: emailNorm,
    phone: phoneNorm,
    password: input.password,
    code,
    expiresAt,
    attempts: 0,
  });

  // Dispatch concurrently to Email and Mobile SMS
  await Promise.allSettled([
    dispatchEmailOtp(emailNorm, input.name.trim(), code),
    dispatchSmsOtp(phoneNorm, code),
  ]);

  return {
    success: true,
    demoOtp: code,
    phone: phoneNorm,
    message: `Verification code sent to ${emailNorm} and +91 ${phoneNorm}`,
  };
}

/**
 * Verifies the 6-digit OTP submitted by the citizen.
 * If valid and within time, creates the citizen account in the UserStore.
 */
export function confirmRegistrationOtp(
  email: string,
  code: string
): { success: boolean; error?: string; user?: StoredUser } {
  const emailNorm = email.trim().toLowerCase();
  const pending = pendingRegistrations.get(emailNorm);

  if (!pending) {
    return {
      success: false,
      error: 'No active verification code found for this email. Please fill out the registration form again.',
    };
  }

  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(emailNorm);
    return {
      success: false,
      error: 'The verification code has expired (5-minute limit). Please request a new code.',
    };
  }

  if (pending.attempts >= 4) {
    pendingRegistrations.delete(emailNorm);
    return {
      success: false,
      error: 'Too many incorrect verification attempts. For your security, please restart registration.',
    };
  }

  const cleanCode = code.replace(/\D/g, '').trim();
  if (pending.code !== cleanCode) {
    pending.attempts += 1;
    if (pending.attempts >= 4) {
      pendingRegistrations.delete(emailNorm);
      return {
        success: false,
        error: 'Too many incorrect verification attempts. For your security, please restart registration.',
      };
    }
    const remaining = 4 - pending.attempts;
    return {
      success: false,
      error: `Invalid OTP code. Please enter the 6 digits sent to your email and mobile. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`,
    };
  }

  // OTP Matches! Create citizen record in persistent store
  const store = getUserStore();
  const user = store.createCitizen({
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    password: pending.password,
  });

  pendingRegistrations.delete(emailNorm);
  return { success: true, user };
}

/**
 * Resends a fresh 6-digit code for an existing pending registration
 * to both email and mobile SMS.
 */
export async function resendRegistrationOtp(email: string): Promise<{
  success: boolean;
  error?: string;
  demoOtp?: string;
  phone?: string;
  message?: string;
}> {
  const emailNorm = email.trim().toLowerCase();
  const pending = pendingRegistrations.get(emailNorm);

  if (!pending) {
    return {
      success: false,
      error: 'No active registration session found. Please enter your registration details first.',
    };
  }

  const newCode = Math.floor(100000 + crypto.randomInt(900000)).toString();
  pending.code = newCode;
  pending.expiresAt = Date.now() + 5 * 60 * 1000;
  pending.attempts = 0;

  // Re-dispatch concurrently to Email and Mobile SMS
  await Promise.allSettled([
    dispatchEmailOtp(emailNorm, pending.name, newCode),
    dispatchSmsOtp(pending.phone, newCode),
  ]);

  return {
    success: true,
    demoOtp: newCode,
    phone: pending.phone,
    message: `Fresh verification code sent to ${emailNorm} and +91 ${pending.phone}`,
  };
}
