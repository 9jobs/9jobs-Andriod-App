import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';
import { LOCKED_INVOICE_PAYMENT_DETAILS } from '@/lib/invoices/defaults';

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    invoiceDate: { type: String, required: true, trim: true },
    billedToName: { type: String, required: true, trim: true },
    billedToEmail: { type: String, required: true, trim: true },
    billedToPhone: { type: String, required: true, trim: true },
    weekLabel: { type: String, required: true, trim: true },
    issuedDate: { type: String, required: true, trim: true },
    validUntil: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    total: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true, default: LOCKED_INVOICE_PAYMENT_DETAILS.accountName },
    bankName: { type: String, required: true, trim: true, default: LOCKED_INVOICE_PAYMENT_DETAILS.bankName },
    accountNumber: { type: String, required: true, trim: true, default: LOCKED_INVOICE_PAYMENT_DETAILS.accountNumber },
    bsb: { type: String, required: true, trim: true, default: LOCKED_INVOICE_PAYMENT_DETAILS.bsb },
    generatedPdfUrl: { type: String, default: '' },
    generatedPdfPath: { type: String, default: '' },
    stripeCustomerId: { type: String, default: '' },
    stripeCheckoutSessionId: { type: String, default: '' },
    stripeCheckoutUrl: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentLinkSentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'previewed', 'sent', 'paid'],
      default: 'draft',
    },
    sentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const mongoModel = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('Invoice') : mongoModel;
