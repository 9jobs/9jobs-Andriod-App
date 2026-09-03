import crypto from 'node:crypto';

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

export function hashPasswordResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createPasswordResetToken() {
  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}
