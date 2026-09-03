import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';
import { LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS } from '@/lib/fortnight-invoices/defaults';

const FortnightInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    invoiceDate: { type: String, required: true, trim: true },
    billedToName: { type: String, required: true, trim: true },
    billedToEmail: { type: String, required: true, trim: true },
    billedToPhone: { type: String, required: true, trim: true },
    monthLabel: { type: String, required: true, trim: true },
    issuedDate: { type: String, required: true, trim: true },
    validUntil: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    total: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true, default: LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.accountName },
    bankName: { type: String, required: true, trim: true, default: LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.bankName },
    accountNumber: { type: String, required: true, trim: true, default: LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.accountNumber },
    bsb: { type: String, required: true, trim: true, default: LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.bsb },
    generatedPdfUrl: { type: String, default: '' },
    generatedPdfPath: { type: String, default: '' },
    paymentMode: {
      type: String,
      enum: ['upfront', 'monthly_autopay'],
      default: 'upfront',
    },
    autopayStatus: {
      type: String,
      enum: ['not_applicable', 'pending_checkout', 'active', 'cancel_at_period_end', 'cancelled', 'payment_failed'],
      default: 'not_applicable',
    },
    stripeCheckoutSessionId: { type: String, default: '' },
    stripeCheckoutUrl: { type: String, default: '' },
    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentLinkTokenHash: { type: String, default: '' },
    paymentLinkIssuedAt: { type: Date, default: null },
    paymentLinkSentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    currentPeriodEnd: { type: Date, default: null },
    autopayCancelRequestedAt: { type: Date, default: null },
    autopayCancelledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'previewed', 'sent', 'paid', 'payment_failed', 'cancelled'],
      default: 'draft',
    },
    sentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const mongoModel = mongoose.models.FortnightInvoice || mongoose.model('FortnightInvoice', FortnightInvoiceSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('FortnightInvoice') : mongoModel;
