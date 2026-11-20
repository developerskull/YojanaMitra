import crypto from 'node:crypto';
import { getUserStore, type StoredUser } from './store';

export interface PendingRegistration {
  name: string;
  email: string;
  password: string;
  code: string;
  expiresAt: number; // Unix timestamp
  attempts: number;
}

// In-memory pending registration pool (5-minute TTL)
const pendingRegistrations = new Map<string, PendingRegistration>();

/**
 * Initiates citizen registration by validating uniqueness and generating
 * a cryptographically random 6-digit OTP code with a 5-minute expiry.
 */
export function requestRegistrationOtp(input: {
  name: string;
  email: string;
  password: string;
}): { success: boolean; error?: string; demoOtp?: string } {
  const emailNorm = input.email.trim().toLowerCase();
  const store = getUserStore();

  // Guard: Email already registered
  if (store.findByEmail(emailNorm)) {
    return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
  }

  // Generate 6-digit numeric OTP (100000 - 999999)
  const code = Math.floor(100000 + crypto.randomInt(900000)).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  pendingRegistrations.set(emailNorm, {
    name: input.name.trim(),
    email: emailNorm,
    password: input.password,
    code,
    expiresAt,
    attempts: 0,
  });

  console.log(`[OTP SERVICE] Generated 6-digit verification code for ${emailNorm}: ${code} (Expires in 5 minutes)`);

  return {
    success: true,
    demoOtp: code,
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
      error: `Invalid OTP code. Please enter the 6 digits sent to your email. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`,
    };
  }

  // OTP Matches! Create citizen record in persistent store
  const store = getUserStore();
  const user = store.createCitizen({
    name: pending.name,
    email: pending.email,
    password: pending.password,
  });

  pendingRegistrations.delete(emailNorm);
  return { success: true, user };
}

/**
 * Resends a fresh 6-digit code for an existing pending registration.
 */
export function resendRegistrationOtp(email: string): {
  success: boolean;
  error?: string;
  demoOtp?: string;
} {
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

  console.log(`[OTP SERVICE] Resent 6-digit verification code for ${emailNorm}: ${newCode}`);

  return {
    success: true,
    demoOtp: newCode,
  };
}
