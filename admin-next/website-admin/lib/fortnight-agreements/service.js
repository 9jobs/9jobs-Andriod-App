import connectDB from '@/utils/db';
import FortnightAgreement from '@/models/FortnightAgreement';
import { generateAgreementPdfArtifact } from '@/lib/fortnight-agreements/pdf';
import { serializeAgreement } from '@/lib/fortnight-agreements/serialize';
import { uploadPrivatePdf, fetchBlobBuffer, fetchBlobBufferByKey } from '@/lib/storage/blob';
import { retryFailedAgreementCompletion } from '@/lib/fortnight-agreements/completion';

const ADMIN_FORTNIGHT_AGREEMENT_LIST_PROJECTION = [
  'clientName',
  'clientEmail',
  'providerSignatureName',
  'initialTerm',
  'servicePrice',
  'clientSignature',
  'providerSignature',
  'status',
  'sentAt',
  'createdAt',
  'updatedAt',
].join(' ');

export async function listAgreements() {
  await connectDB();
  const agreements = await FortnightAgreement.find({}).sort({ createdAt: -1 }).lean();
  return agreements.map(serializeAgreement);
}

export async function listAdminAgreements() {
  await connectDB();
  const agreements = await FortnightAgreement.find({})
    .select(ADMIN_FORTNIGHT_AGREEMENT_LIST_PROJECTION)
    .sort({ createdAt: -1 })
    .lean();
  return agreements.map(serializeAgreement);
}

export async function deleteAllAgreements() {
  await connectDB();
  const result = await FortnightAgreement.deleteMany({});
  return result.deletedCount || 0;
}

export async function getAgreementById(id) {
  await connectDB();
  const agreement = await FortnightAgreement.findById(id);
  return agreement ? serializeAgreement(agreement) : null;
}

export async function getAgreementDocumentById(id) {
  await connectDB();
  return FortnightAgreement.findById(id);
}

export async function createAgreement(payload) {
  await connectDB();
  const agreement = await FortnightAgreement.create({
    ...payload,
    notes: payload.notes || '',
    status: 'draft',
  });

  return serializeAgreement(agreement);
}

export async function updateAgreementById(id, updates) {
  await connectDB();
  const existingAgreement = await FortnightAgreement.findById(id);

  if (!existingAgreement) {
    return null;
  }

  if (existingAgreement.status === 'completed') {
    throw new Error('Completed agreements cannot be edited.');
  }

  const agreement = await FortnightAgreement.findByIdAndUpdate(
    id,
    {
      ...updates,
      generatedPdfUrl: '',
      generatedPdfPath: '',
      signedPdfUrl: '',
      signedPdfPath: '',
      signedPdfStorageKey: '',
      auditTrailUrl: '',
      auditTrailStorageKey: '',
      originalPdfUrl: '',
      originalPdfStorageKey: '',
      originalPdfSha256: '',
      signedPdfSha256: '',
      auditTrailSha256: '',
      pdfAnchorCoords: {
        providerSign: { pageIndex: 0, x: 0, y: 0 },
        customerSign: { pageIndex: 0, x: 0, y: 0 },
        dateBlock: { pageIndex: 0, x: 0, y: 0 },
      },
      clientSigningTokenHash: '',
      providerSigningTokenHash: '',
      clientTokenExpiresAt: null,
      providerTokenExpiresAt: null,
      clientTokenUsedAt: null,
      providerTokenUsedAt: null,
      clientOtpHash: '',
      providerOtpHash: '',
      clientOtpExpiresAt: null,
      providerOtpExpiresAt: null,
      clientOtpAttempts: 0,
      providerOtpAttempts: 0,
      clientOtpCooldownUntil: null,
      providerOtpCooldownUntil: null,
      clientOtpVerifiedAt: null,
      providerOtpVerifiedAt: null,
      clientDocumentViewedAt: null,
      providerDocumentViewedAt: null,
      clientInvitationSentAt: null,
      providerInvitationSentAt: null,
      clientCompletionEmailSentAt: null,
      providerCompletionEmailSentAt: null,
      clientConsentAcceptedAt: null,
      providerConsentAcceptedAt: null,
      clientSignature: {
        name: '',
        ip: '',
        userAgent: '',
        signedAt: null,
        signatureFileKey: '',
        signatureType: '',
      },
      providerSignature: {
        name: '',
        ip: '',
        userAgent: '',
        signedAt: null,
        signatureFileKey: '',
        signatureType: '',
      },
      clientDownloadTokenHash: '',
      providerDownloadTokenHash: '',
      downloadTokenExpiresAt: null,
      completionLockId: '',
      completionStartedAt: null,
      completionAttemptCount: 0,
      status: 'draft',
      sentAt: null,
      signedAt: null,
      lastViewedAt: null,
      docuSignEnvelopeId: '',
      esignProvider: '',
      esignError: '',
      envelopeEvents: [],
    },
    { new: true }
  );

  return agreement ? serializeAgreement(agreement) : null;
}

export async function deleteAgreementById(id) {
  await connectDB();
  const result = await FortnightAgreement.findByIdAndDelete(id);
  return Boolean(result);
}

export async function generateAndStoreAgreementPdf(agreementDocument) {
  const artifact = await generateAgreementPdfArtifact({
    ...agreementDocument.toObject(),
    _id: String(agreementDocument._id),
  });
  const buffer = artifact.buffer;

  const upload = await uploadPrivatePdf({
    folder: `fortnight-agreements/${agreementDocument._id}`,
    fileName: 'generated-agreement.pdf',
    buffer,
    contentType: 'application/pdf',
  });

  agreementDocument.generatedPdfUrl = upload.url;
  agreementDocument.generatedPdfPath = upload.path;
  agreementDocument.pdfAnchorCoords = artifact.anchorCoords;
  agreementDocument.status = agreementDocument.status === 'draft' ? 'previewed' : agreementDocument.status;
  await agreementDocument.save();

  return {
    agreement: serializeAgreement(agreementDocument),
    buffer,
  };
}

export async function getAgreementPdfBuffer(agreement, variant = 'generated') {
  if (variant === 'signed') {
    if (agreement.signedPdfStorageKey) {
      return fetchBlobBufferByKey(agreement.signedPdfStorageKey);
    }
    if (agreement.signedPdfUrl) {
      const url = agreement.signedPdfUrl;
      if (url.startsWith('data:application/pdf;base64,')) {
        const base64Data = url.substring(url.indexOf(',') + 1);
        return Buffer.from(base64Data, 'base64');
      }
      return fetchBlobBuffer(url);
    }
    return null;
  }

  if (agreement.originalPdfStorageKey) {
    return fetchBlobBufferByKey(agreement.originalPdfStorageKey);
  }
  if (agreement.generatedPdfPath) {
    return fetchBlobBufferByKey(agreement.generatedPdfPath);
  }
  
  const url = agreement.generatedPdfUrl;
  if (!url) {
    return null;
  }

  if (url.startsWith('data:application/pdf;base64,')) {
    const base64Data = url.substring(url.indexOf(',') + 1);
    return Buffer.from(base64Data, 'base64');
  }

  return fetchBlobBuffer(url);
}
