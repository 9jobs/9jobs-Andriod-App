import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';

const ServiceFeedbackSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  overall_satisfaction: { type: Number, required: true },
  experience_message: { type: String, required: true },
  sentiment: { type: String, required: true },
  show_as_testimonial: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const mongoModel = mongoose.models.ServiceFeedback || mongoose.model('ServiceFeedback', ServiceFeedbackSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('ServiceFeedback') : mongoModel;
