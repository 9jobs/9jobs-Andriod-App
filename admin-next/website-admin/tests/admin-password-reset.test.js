import { describe, expect, test } from '@jest/globals';

import {
  createPasswordResetToken,
  hashPasswordResetToken,
} from '@/lib/admin/auth/password-reset';

describe('admin password reset helpers', () => {
  test('creates a reset token pair with an expiry', () => {
    const reset = createPasswordResetToken();

    expect(typeof reset.token).toBe('string');
    expect(reset.token).not.toHaveLength(0);
    expect(reset.tokenHash).toBe(hashPasswordResetToken(reset.token));
    expect(reset.expiresAt).toBeInstanceOf(Date);
  });
});
