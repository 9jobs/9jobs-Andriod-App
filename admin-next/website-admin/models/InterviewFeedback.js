import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';

const InterviewFeedbackSchema = new mongoose.Schema({
  interviewer_name: { type: String, required: true },
  job_role: { type: String, required: true },
  overall_rating: { type: Number, required: true },
  experience_message: { type: String, required: true },
  sentiment: { type: String, required: true },
  show_as_experience: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const mongoModel = mongoose.models.InterviewFeedback || mongoose.model('InterviewFeedback', InterviewFeedbackSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('InterviewFeedback') : mongoModel;
