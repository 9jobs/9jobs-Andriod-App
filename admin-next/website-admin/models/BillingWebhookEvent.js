import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';

const BillingWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    processedAt: { type: Date, default: Date.now },
    clientId: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

const mongoModel = mongoose.models.BillingWebhookEvent || mongoose.model('BillingWebhookEvent', BillingWebhookEventSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('BillingWebhookEvent') : mongoModel;
