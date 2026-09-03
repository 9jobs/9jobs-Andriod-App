import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';

const RateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 1 },
    resetAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically delete expired rate limit records
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const mongoModel = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('RateLimit') : mongoModel;
