import crypto from 'node:crypto';

const SESSION_ALGORITHM = 'HS256';
const SESSION_ROLE = 'admin';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';

  if (!secret) {
    throw new Error('JWT_SECRET is required.');
  }

  return secret;
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function sign(value) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function createAdminSessionToken({ id = '', email, name = '' }) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: SESSION_ALGORITHM, typ: 'JWT' }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: id,
      email,
      name,
      role: SESSION_ROLE,
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    })
  );
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token) {
  const [header, payload, signature] = String(token || '').split('.');

  if (!header || !payload || !signature) {
    throw new Error('Invalid admin session token.');
  }

  const expectedSignature = sign(`${header}.${payload}`);
  const actualSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    actualSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(actualSignatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error('Invalid admin session token.');
  }

  const parsedPayload = JSON.parse(decodeBase64Url(payload));

  if (parsedPayload.role !== SESSION_ROLE) {
    throw new Error('Invalid admin session token.');
  }

  if (parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Admin session token has expired.');
  }

  return parsedPayload;
}
