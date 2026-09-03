import connectDB from '@/utils/db';
import RateLimit from '@/models/RateLimit';

/**
 * Checks if a key has exceeded the maximum attempts within a fixed time window.
 * Uses atomic increments and relies on Mongoose TTL index for auto-cleanup.
 * 
 * @param {string} key Unique identifier for the rate limit (e.g. "ip:otp" or "email:login")
 * @param {number} maxAttempts Maximum number of attempts allowed in the window
 * @param {number} windowMs Fixed window duration in milliseconds
 * @returns {Promise<boolean>} True if rate limited (exceeded), false otherwise
 */
export async function isRateLimited(key, maxAttempts, windowMs) {
  await connectDB();
  const now = new Date();

  // Explicitly clear stale records to guarantee correctness before upsert
  await RateLimit.deleteMany({ key, resetAt: { $lt: now } });

  // Atomic update: increment attempts and set resetAt if inserting a new record
  const record = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { attempts: 1 },
      $setOnInsert: { resetAt: new Date(Date.now() + windowMs) }
    },
    { upsert: true, new: true }
  );

  if (record.attempts > maxAttempts) {
    return true;
  }
  return false;
}
