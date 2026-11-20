import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestRegistrationOtp,
  confirmRegistrationOtp,
  resendRegistrationOtp,
} from '@/lib/auth/otp';
import { getUserStore } from '@/lib/auth/store';

describe('OTP Verification Service', () => {
  beforeEach(() => {
    // Reset store state if needed
  });

  it('rejects OTP request for an already registered email', () => {
    // citizen@yojanamitra.in is already seeded in store
    const result = requestRegistrationOtp({
      name: 'Existing Citizen',
      email: 'citizen@yojanamitra.in',
      password: 'Password@123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('generates a 6-digit numeric OTP for a new citizen registration', () => {
    const testEmail = `citizen.${Date.now()}@example.com`;
    const result = requestRegistrationOtp({
      name: 'Ramesh Patil',
      email: testEmail,
      password: 'SecurePassword@123',
    });

    expect(result.success).toBe(true);
    expect(result.demoOtp).toBeDefined();
    expect(result.demoOtp).toMatch(/^\d{6}$/);
  });

  it('rejects confirmation with incorrect OTP and tracks attempt limit', () => {
    const testEmail = `attempt.${Date.now()}@example.com`;
    const req = requestRegistrationOtp({
      name: 'Pooja Kadam',
      email: testEmail,
      password: 'SecurePassword@123',
    });
    expect(req.success).toBe(true);

    // Wrong OTP 1
    const attempt1 = confirmRegistrationOtp(testEmail, '000000');
    expect(attempt1.success).toBe(false);
    expect(attempt1.error).toContain('3 attempts remaining');

    // Wrong OTP 2
    const attempt2 = confirmRegistrationOtp(testEmail, '111111');
    expect(attempt2.success).toBe(false);
    expect(attempt2.error).toContain('2 attempts remaining');

    // Wrong OTP 3
    const attempt3 = confirmRegistrationOtp(testEmail, '222222');
    expect(attempt3.success).toBe(false);
    expect(attempt3.error).toContain('1 attempt remaining');

    // Wrong OTP 4 - triggers lockout
    const attempt4 = confirmRegistrationOtp(testEmail, '333333');
    expect(attempt4.success).toBe(false);
    expect(attempt4.error).toContain('Too many incorrect verification attempts');

    // Subsequent call fails
    const attempt5 = confirmRegistrationOtp(testEmail, req.demoOtp!);
    expect(attempt5.success).toBe(false);
    expect(attempt5.error).toContain('No active verification code');
  });

  it('successfully verifies with correct OTP and creates citizen account', () => {
    const testEmail = `verified.${Date.now()}@example.com`;
    const req = requestRegistrationOtp({
      name: 'Vikram Shinde',
      email: testEmail,
      password: 'ValidPassword@123',
    });

    expect(req.success).toBe(true);
    const validOtp = req.demoOtp!;

    const result = confirmRegistrationOtp(testEmail, validOtp);
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.name).toBe('Vikram Shinde');
    expect(result.user?.email).toBe(testEmail);
    expect(result.user?.role).toBe('user');

    // Verify user can now be found in user store
    const store = getUserStore();
    const stored = store.findByEmail(testEmail);
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('Vikram Shinde');
  });

  it('allows resending a fresh OTP code', () => {
    const testEmail = `resend.${Date.now()}@example.com`;
    const req = requestRegistrationOtp({
      name: 'Anjali Verma',
      email: testEmail,
      password: 'Password@987',
    });
    const firstOtp = req.demoOtp!;

    const resend = resendRegistrationOtp(testEmail);
    expect(resend.success).toBe(true);
    expect(resend.demoOtp).toBeDefined();
    expect(resend.demoOtp).toMatch(/^\d{6}$/);

    // Old OTP should no longer work if the new one is different
    if (resend.demoOtp !== firstOtp) {
      const oldVerify = confirmRegistrationOtp(testEmail, firstOtp);
      expect(oldVerify.success).toBe(false);
    }

    // New OTP succeeds
    const newVerify = confirmRegistrationOtp(testEmail, resend.demoOtp!);
    expect(newVerify.success).toBe(true);
    expect(newVerify.user?.name).toBe('Anjali Verma');
  });
});
