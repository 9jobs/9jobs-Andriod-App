import mongoose from 'mongoose';
import { getSupabaseModel } from '@/lib/storage/supabase-model';

const AgreementSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, trim: true },
    clientPhone: { type: String, required: true, trim: true },
    providerName: { type: String, required: true, trim: true },
    providerEmail: { type: String, required: true, trim: true },
    providerPhone: { type: String, required: true, trim: true },
    providerSignatureName: { type: String, required: true, trim: true },
    providerAbn: { type: String, default: '83679842972', trim: true },
    agreementDate: { type: String, required: true, trim: true },
    packageName: { type: String, required: true, trim: true },
    servicePrice: { type: String, required: true, trim: true },
    weeklyJobTarget: { type: String, required: true, trim: true },
    initialTerm: { type: String, required: true, trim: true },
    paymentDay: { type: String, default: 'Monday', trim: true },
    notes: { type: String, default: '', trim: true },
    generatedPdfUrl: { type: String, default: '' },
    generatedPdfPath: { type: String, default: '' },
    signedPdfUrl: { type: String, default: '' },
    signedPdfPath: { type: String, default: '' },
    docuSignEnvelopeId: { type: String, default: '' },
    esignProvider: { type: String, default: '' },
    
    clientSigningTokenHash: { type: String, default: '' },
    providerSigningTokenHash: { type: String, default: '' },
    clientTokenExpiresAt: { type: Date, default: null },
    providerTokenExpiresAt: { type: Date, default: null },
    clientTokenUsedAt: { type: Date, default: null },
    providerTokenUsedAt: { type: Date, default: null },

    clientOtpHash: { type: String, default: '' },
    providerOtpHash: { type: String, default: '' },
    clientOtpExpiresAt: { type: Date, default: null },
    providerOtpExpiresAt: { type: Date, default: null },
    clientOtpAttempts: { type: Number, default: 0 },
    providerOtpAttempts: { type: Number, default: 0 },
    clientOtpCooldownUntil: { type: Date, default: null },
    providerOtpCooldownUntil: { type: Date, default: null },

    clientOtpVerifiedAt: { type: Date, default: null },
    providerOtpVerifiedAt: { type: Date, default: null },
    clientDocumentViewedAt: { type: Date, default: null },
    providerDocumentViewedAt: { type: Date, default: null },
    clientInvitationSentAt: { type: Date, default: null },
    providerInvitationSentAt: { type: Date, default: null },
    clientCompletionEmailSentAt: { type: Date, default: null },
    providerCompletionEmailSentAt: { type: Date, default: null },

    consentTextVersion: { type: String, default: '1.0' },
    clientConsentAcceptedAt: { type: Date, default: null },
    providerConsentAcceptedAt: { type: Date, default: null },

    clientSignature: {
      name: { type: String, default: '' },
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
      signedAt: { type: Date, default: null },
      signatureFileKey: { type: String, default: '' },
      signatureType: { type: String, default: '' } // 'drawn' or 'typed'
    },
    providerSignature: {
      name: { type: String, default: '' },
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
      signedAt: { type: Date, default: null },
      signatureFileKey: { type: String, default: '' },
      signatureType: { type: String, default: '' } // 'drawn' or 'typed'
    },

    clientDownloadTokenHash: { type: String, default: '' },
    providerDownloadTokenHash: { type: String, default: '' },
    downloadTokenExpiresAt: { type: Date, default: null },

    originalPdfSha256: { type: String, default: '' },
    signedPdfSha256: { type: String, default: '' },
    auditTrailSha256: { type: String, default: '' },

    originalPdfUrl: { type: String, default: '' },
    signedPdfUrl: { type: String, default: '' },
    auditTrailUrl: { type: String, default: '' },

    originalPdfStorageKey: { type: String, default: '' },
    signedPdfStorageKey: { type: String, default: '' },
    auditTrailStorageKey: { type: String, default: '' },
    pdfAnchorCoords: {
      providerSign: {
        pageIndex: { type: Number, default: 0 },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      customerSign: {
        pageIndex: { type: Number, default: 0 },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      dateBlock: {
        pageIndex: { type: Number, default: 0 },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
    },

    completionLockId: { type: String, default: '' },
    completionStartedAt: { type: Date, default: null },
    completionAttemptCount: { type: Number, default: 0 },
    esignError: { type: String, default: '' },

    status: {
      type: String,
      enum: [
        'draft', 'previewed', 'sent', 'delivered', 'viewed', 'completed', 'declined', 'voided',
        'sent_to_client', 'client_signed', 'sent_to_provider', 'completion_processing',
        'send_failed', 'client_signing_failed', 'provider_signing_failed', 'completion_processing_failed',
        'cancelled', 'expired'
      ],
      default: 'draft',
    },
    sentAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    lastViewedAt: { type: Date, default: null },
    docuSignLastSyncedAt: { type: Date, default: null },
    envelopeEvents: [
      {
        status: { type: String, required: true },
        receivedAt: { type: Date, default: Date.now },
        payload: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
  },
  {
    timestamps: true,
  }
);

AgreementSchema.index({ createdAt: -1 });
AgreementSchema.index(
  {
    createdAt: -1,
    _id: 1,
    clientName: 1,
    clientEmail: 1,
    providerSignatureName: 1,
    packageName: 1,
    status: 1,
    sentAt: 1,
    signedPdfUrl: 1,
    updatedAt: 1,
  },
  { name: 'admin_register_listing_idx' }
);
AgreementSchema.index({ status: 1, createdAt: -1 });
AgreementSchema.index({ status: 1, updatedAt: -1 });
AgreementSchema.index({ docuSignEnvelopeId: 1, status: 1 });
AgreementSchema.index({ status: 1, docuSignLastSyncedAt: 1 });

const mongoModel = mongoose.models.Agreement || mongoose.model('Agreement', AgreementSchema);
export default process.env.DATABASE_PROVIDER === 'supabase' ? getSupabaseModel('Agreement') : mongoModel;
