import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestRegistrationOtp,
  confirmRegistrationOtp,
  resendRegistrationOtp,
  normalizeIndianMobile,
} from '@/lib/auth/otp';
import { getUserStore } from '@/lib/auth/store';

describe('OTP Verification Service', () => {
  beforeEach(() => {
    // Reset store state if needed
  });

  it('validates and normalizes 10-digit Indian mobile numbers', () => {
    // Valid formats
    expect(normalizeIndianMobile('9820012345')).toEqual({ valid: true, normalized: '9820012345' });
    expect(normalizeIndianMobile('+91 98200 12345')).toEqual({ valid: true, normalized: '9820012345' });
    expect(normalizeIndianMobile('09820012345')).toEqual({ valid: true, normalized: '9820012345' });
    expect(normalizeIndianMobile('919820012345')).toEqual({ valid: true, normalized: '9820012345' });

    // Invalid formats
    expect(normalizeIndianMobile('12345').valid).toBe(false);
    expect(normalizeIndianMobile('5820012345').valid).toBe(false); // starts with 5 (not 6,7,8,9)
    expect(normalizeIndianMobile('abcdefghij').valid).toBe(false);
  });

  it('rejects OTP request for an invalid mobile number', async () => {
    const result = await requestRegistrationOtp({
      name: 'Sunita Deshmukh',
      email: `valid.${Date.now()}@example.com`,
      phone: '12345', // invalid length
      password: 'Password@123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('10-digit mobile number');
  });

  it('rejects OTP request for an already registered email', async () => {
    // citizen@yojanamitra.in is already seeded in store
    const result = await requestRegistrationOtp({
      name: 'Existing Citizen',
      email: 'citizen@yojanamitra.in',
      phone: '9820012345',
      password: 'Password@123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('generates a 6-digit numeric OTP and delivers to both email and mobile', async () => {
    const testEmail = `citizen.${Date.now()}@example.com`;
    const result = await requestRegistrationOtp({
      name: 'Ramesh Patil',
      email: testEmail,
      phone: '+91 98200 12345',
      password: 'SecurePassword@123',
    });

    expect(result.success).toBe(true);
    expect(result.demoOtp).toBeDefined();
    expect(result.demoOtp).toMatch(/^\d{6}$/);
    expect(result.phone).toBe('9820012345');
    expect(result.message).toContain('9820012345');
  });

  it('rejects confirmation with incorrect OTP and tracks attempt limit', async () => {
    const testEmail = `attempt.${Date.now()}@example.com`;
    const req = await requestRegistrationOtp({
      name: 'Pooja Kadam',
      email: testEmail,
      phone: '9820012345',
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

  it('successfully verifies with correct OTP and creates citizen account with phone number', async () => {
    const testEmail = `verified.${Date.now()}@example.com`;
    const req = await requestRegistrationOtp({
      name: 'Vikram Shinde',
      email: testEmail,
      phone: '9820098765',
      password: 'ValidPassword@123',
    });

    expect(req.success).toBe(true);
    const validOtp = req.demoOtp!;

    const result = confirmRegistrationOtp(testEmail, validOtp);
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.name).toBe('Vikram Shinde');
    expect(result.user?.email).toBe(testEmail);
    expect(result.user?.phone).toBe('9820098765');
    expect(result.user?.role).toBe('user');

    // Verify user can now be found in user store
    const store = getUserStore();
    const stored = store.findByEmail(testEmail);
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('Vikram Shinde');
    expect(stored?.phone).toBe('9820098765');
  });

  it('allows resending a fresh OTP code to both email and phone', async () => {
    const testEmail = `resend.${Date.now()}@example.com`;
    const req = await requestRegistrationOtp({
      name: 'Anjali Verma',
      email: testEmail,
      phone: '9820054321',
      password: 'Password@987',
    });
    const firstOtp = req.demoOtp!;

    const resend = await resendRegistrationOtp(testEmail);
    expect(resend.success).toBe(true);
    expect(resend.demoOtp).toBeDefined();
    expect(resend.demoOtp).toMatch(/^\d{6}$/);
    expect(resend.phone).toBe('9820054321');

    // Old OTP should no longer work if the new one is different
    if (resend.demoOtp !== firstOtp) {
      const oldVerify = confirmRegistrationOtp(testEmail, firstOtp);
      expect(oldVerify.success).toBe(false);
    }

    // New OTP succeeds
    const newVerify = confirmRegistrationOtp(testEmail, resend.demoOtp!);
    expect(newVerify.success).toBe(true);
    expect(newVerify.user?.name).toBe('Anjali Verma');
    expect(newVerify.user?.phone).toBe('9820054321');
  });
});
