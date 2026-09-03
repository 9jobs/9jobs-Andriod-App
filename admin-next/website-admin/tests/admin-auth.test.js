import { describe, expect, test } from '@jest/globals';

import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/admin/auth/session';

describe('admin session token helpers', () => {
  test('creates a verifiable admin session token', async () => {
    const token = await createAdminSessionToken({
      email: 'admin@9jobs.co',
    });

    const payload = await verifyAdminSessionToken(token);

    expect(typeof token).toBe('string');
    expect(payload.email).toBe('admin@9jobs.co');
    expect(payload.role).toBe('admin');
  });

  test('rejects a tampered admin session token', async () => {
    const token = await createAdminSessionToken({
      email: 'admin@9jobs.co',
    });

    await expect(
      verifyAdminSessionToken(`${token}tampered`)
    ).rejects.toThrow('Invalid admin session token.');
  });
});
