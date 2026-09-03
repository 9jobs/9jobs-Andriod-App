import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';

const BillingAuditEntrySchema = new mongoose.Schema(
  {
    type: { type: String, default: '', trim: true },
    message: { type: String, default: '', trim: true },
    actor: { type: String, default: '', trim: true },
    source: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BillingSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      enum: ['none', 'standard_weekly', 'success_based'],
      default: 'none',
    },
    planLabel: { type: String, default: '', trim: true },
    billingState: {
      type: String,
      enum: [
        'PENDING_AGREEMENT',
        'PENDING_CHECKOUT',
        'ACTIVE_SUBSCRIPTION',
        'PAYMENT_ACTION_REQUIRED',
        'CANCEL_AT_PERIOD_END',
        'CANCELLED',
        'OVERDUE',
        'SUCCESS_FEE_DUE',
        'COMPLETED',
      ],
      default: 'PENDING_AGREEMENT',
    },
    agreedWeeklyAmountCents: { type: Number, default: 0 },
    onboardingFeeCents: { type: Number, default: 20000 },
    latestSuccessFeeAmountCents: { type: Number, default: 0 },
    currency: { type: String, default: 'aud', trim: true },
    billingFrequency: { type: String, default: 'week', trim: true },
    agreementId: { type: String, default: '', trim: true },
    agreementUrl: { type: String, default: '', trim: true },
    agreementStatus: { type: String, default: '', trim: true },
    checkoutTermsVersion: { type: String, default: 'weekly-subscription-v2', trim: true },
    checkoutDisclosureText: { type: String, default: '', trim: true },
    cancellationPolicy: { type: String, default: 'period_end', trim: true },
    paymentPageTokenHash: { type: String, default: '', trim: true },
    paymentPageTokenIssuedAt: { type: Date, default: null },
    paymentPageTokenExpiresAt: { type: Date, default: null },
    paymentPageLastSentAt: { type: Date, default: null },
    subscriptionAuthorisationStatus: {
      type: String,
      enum: ['inactive', 'active', 'cancelled', 'revoked'],
      default: 'inactive',
    },
    authorisedAt: { type: Date, default: null },
    consentIp: { type: String, default: '', trim: true },
    consentUserAgent: { type: String, default: '', trim: true },
    stripeCustomerId: { type: String, default: '', trim: true },
    stripeSubscriptionId: { type: String, default: '', trim: true },
    checkoutSessionId: { type: String, default: '', trim: true },
    lastInvoiceId: { type: String, default: '', trim: true },
    lastPaymentIntentId: { type: String, default: '', trim: true },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelRequestedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    customerPortalLastOpenedAt: { type: Date, default: null },
    successFeeInvoiceId: { type: String, default: '', trim: true },
    successFeeCheckoutSessionId: { type: String, default: '', trim: true },
    auditLog: { type: [BillingAuditEntrySchema], default: [] },
  },
  { _id: false }
);

const ClientInfoSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    contactNo: { type: String, required: true, trim: true },
    workingRights: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    dob: { type: String, required: true, trim: true }, // Store as string (YYYY-MM-DD) or date
    expectedSalary: { type: String, required: true, trim: true },
    preferredJobLocation: { type: String, required: true, trim: true },
    workType: { type: String, required: true, trim: true },
    noticePeriod: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Placed as per requirement table "Password New"
    preferredRole: { type: String, required: true, trim: true },
    resumeUrl: { type: String, default: '' },
    resumeStorageKey: { type: String, default: '' },
    resumeFileName: { type: String, default: '' },
    coverLetterUrl: { type: String, default: '' },
    coverLetterStorageKey: { type: String, default: '' },
    coverLetterFileName: { type: String, default: '' },
    billing: { type: BillingSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

ClientInfoSchema.index({ createdAt: -1 });
ClientInfoSchema.index({ email: 1 });
ClientInfoSchema.index({ 'billing.paymentPageTokenHash': 1 });
ClientInfoSchema.index({ 'billing.stripeCustomerId': 1 });
ClientInfoSchema.index({ 'billing.stripeSubscriptionId': 1 });

const mongoModel = mongoose.models.ClientInfo || mongoose.model('ClientInfo', ClientInfoSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('ClientInfo') : mongoModel;
