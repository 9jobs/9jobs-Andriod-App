import crypto from 'node:crypto';

/**
 * Generates a cryptographically secure 32-byte random hex token.
 * @returns {string}
 */
export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a SHA-256 hash of a plain text token.
 * @param {string} token 
 * @returns {string}
 */
export function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 6-digit numeric OTP.
 * @returns {string}
 */
export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with a server-side secret using HMAC-SHA256
 * to reduce offline brute-forcing risks of the 6-digit search space.
 * @param {string} otp 
 * @returns {string}
 */
export function hashOtp(otp) {
  if (!otp) return '';
  const secret = process.env.OTP_SECRET || 'default-9jobs-otp-salt-key-2026';
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

/**
 * Computes the SHA-256 checksum of a PDF file buffer.
 * @param {Buffer} buffer 
 * @returns {string}
 */
export function hashPdf(buffer) {
  if (!buffer) return '';
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Perform dummy timingSafeEqual to avoid early exit timing leaks
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
