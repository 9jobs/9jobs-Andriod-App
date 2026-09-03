import { describe, expect, test } from '@jest/globals';

import {
  adminForgotPasswordSchema,
  adminResetPasswordSchema,
  adminSignupSchema,
} from '@/lib/admin/auth/admin-auth-schemas';

describe('admin auth schemas', () => {
  test('accepts a valid admin signup payload', () => {
    const payload = adminSignupSchema.parse({
      name: 'Owner',
      email: 'owner@9jobs.co',
      password: 'super-secret',
      confirmPassword: 'super-secret',
    });

    expect(payload.email).toBe('owner@9jobs.co');
    expect(payload.name).toBe('Owner');
  });

  test('rejects a signup payload with mismatched passwords', () => {
    expect(() =>
      adminSignupSchema.parse({
        name: 'Owner',
        email: 'owner@9jobs.co',
        password: 'super-secret',
        confirmPassword: 'different-secret',
      })
    ).toThrow('Passwords do not match.');
  });

  test('requires a valid forgot-password email', () => {
    expect(() =>
      adminForgotPasswordSchema.parse({
        email: 'not-an-email',
      })
    ).toThrow();
  });

  test('accepts a valid reset-password payload', () => {
    const payload = adminResetPasswordSchema.parse({
      token: '12345678901234567890reset-token',
      password: 'fresh-secret',
      confirmPassword: 'fresh-secret',
    });

    expect(payload.token).toBe('12345678901234567890reset-token');
  });
});
