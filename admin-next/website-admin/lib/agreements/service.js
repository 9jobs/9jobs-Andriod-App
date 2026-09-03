import connectDB from '@/utils/db';
import Agreement from '@/models/Agreement';
import { generateAgreementPdfArtifact } from '@/lib/agreements/pdf';
import { serializeAgreement } from '@/lib/agreements/serialize';
import { uploadPrivatePdf, fetchBlobBuffer, fetchBlobBufferByKey } from '@/lib/storage/blob';
import {
  downloadCompletedEnvelopePdf,
  getDocuSignEnvelopeStatus,
  hasDocuSignRuntimeConfig,
} from '@/lib/docusign/client';
import { mapDocuSignEnvelopeStatus } from '@/lib/docusign/status';
import { retryFailedAgreementCompletion } from '@/lib/agreements/completion';

const ACTIVE_DOCUSIGN_STATUSES = ['sent', 'delivered', 'viewed'];
const TERMINAL_DOCUSIGN_STATUSES = ['completed', 'declined', 'voided'];
const ADMIN_AGREEMENT_LIST_CACHE_MS = 1000 * 60 * 5;
const ADMIN_AGREEMENT_LIST_PROJECTION = [
  'clientName',
  'clientEmail',
  'providerSignatureName',
  'packageName',
  'clientSignature',
  'providerSignature',
  'status',
  'sentAt',
  'signedPdfUrl',
  'createdAt',
  'updatedAt',
].join(' ');
const ADMIN_AGREEMENT_LIST_PROJECTION_FIELDS = {
  clientName: 1,
  clientEmail: 1,
  providerSignatureName: 1,
  packageName: 1,
  clientSignature: 1,
  providerSignature: 1,
  status: 1,
  sentAt: 1,
  signedPdfUrl: 1,
  createdAt: 1,
  updatedAt: 1,
};

function shouldSyncAgreementStatus(agreementDocument) {
  return Boolean(
    agreementDocument?.docuSignEnvelopeId &&
      !TERMINAL_DOCUSIGN_STATUSES.includes(agreementDocument.status)
  );
}

function shouldAppendEnvelopeEvent(agreementDocument, rawStatus) {
  const latestEvent = agreementDocument.envelopeEvents?.[agreementDocument.envelopeEvents.length - 1];
  return latestEvent?.status !== rawStatus;
}

function getAdminAgreementListCacheState() {
  if (!globalThis.__nineJobsAdminAgreementListCache) {
    globalThis.__nineJobsAdminAgreementListCache = {
      data: null,
      expiresAt: 0,
      promise: null,
    };
  }

  return globalThis.__nineJobsAdminAgreementListCache;
}

function invalidateAdminAgreementListCache() {
  const cacheState = getAdminAgreementListCacheState();
  cacheState.data = null;
  cacheState.expiresAt = 0;
  cacheState.promise = null;
}

export async function listAgreements() {
  await connectDB();
  const agreements = await Agreement.find({}).sort({ createdAt: -1 }).lean();
  return agreements.map(serializeAgreement);
}

export async function listAdminAgreements() {
  const cacheState = getAdminAgreementListCacheState();
  const now = Date.now();

  if (cacheState.data && cacheState.expiresAt > now) {
    return cacheState.data;
  }

  if (cacheState.promise) {
    return cacheState.promise;
  }

  await connectDB();
  cacheState.promise = Agreement.collection
    .find({}, { projection: ADMIN_AGREEMENT_LIST_PROJECTION_FIELDS })
    .hint('admin_register_listing_idx')
    .sort({ createdAt: -1 })
    .toArray()
    .then((agreements) => {
      const serialized = agreements.map(serializeAgreement);
      cacheState.data = serialized;
      cacheState.expiresAt = Date.now() + ADMIN_AGREEMENT_LIST_CACHE_MS;
      return serialized;
    })
    .finally(() => {
      cacheState.promise = null;
    });

  return cacheState.promise;
}

export async function deleteAllAgreements() {
  await connectDB();
  const result = await Agreement.deleteMany({});
  invalidateAdminAgreementListCache();
  return result.deletedCount || 0;
}

export async function getAgreementById(id) {
  await connectDB();
  const agreement = await Agreement.findById(id);
  return agreement ? serializeAgreement(agreement) : null;
}

export async function getAgreementDocumentById(id) {
  await connectDB();
  return Agreement.findById(id);
}

export async function syncAgreementDocumentStatusFromDocuSign(agreementDocument, options = {}) {
  if (!shouldSyncAgreementStatus(agreementDocument) || !hasDocuSignRuntimeConfig()) {
    return agreementDocument ? serializeAgreement(agreementDocument) : null;
  }

  const envelope = await getDocuSignEnvelopeStatus(agreementDocument.docuSignEnvelopeId, options);
  const rawStatus = String(envelope?.status || '').toLowerCase();
  agreementDocument.docuSignLastSyncedAt = new Date();

  if (!rawStatus) {
    await agreementDocument.save();
    return serializeAgreement(agreementDocument);
  }

  const mappedStatus = mapDocuSignEnvelopeStatus(rawStatus);

  if (shouldAppendEnvelopeEvent(agreementDocument, rawStatus)) {
    agreementDocument.envelopeEvents.push({
      status: rawStatus,
      payload: envelope,
    });
  }

  agreementDocument.status = mappedStatus;

  if (mappedStatus === 'completed') {
    agreementDocument.signedAt = agreementDocument.signedAt || new Date();
    await agreementDocument.save();
    invalidateAdminAgreementListCache();

    if (!agreementDocument.signedPdfUrl) {
      await attachSignedAgreementPdf(agreementDocument);
    }
  } else {
    await agreementDocument.save();
    invalidateAdminAgreementListCache();
  }

  return serializeAgreement(agreementDocument);
}

const COOLDOWN_MS = 1000 * 60 * 5; // 5 minutes cooldown

function getAgreementSyncState() {
  if (!globalThis.__nineJobsAgreementSyncState) {
    globalThis.__nineJobsAgreementSyncState = {
      lastSyncTime: 0,
      lastRecoveryTime: 0,
    };
  }

  return globalThis.__nineJobsAgreementSyncState;
}

function getAgreementSyncFailureState() {
  if (!globalThis.__nineJobsAgreementSyncFailureState) {
    globalThis.__nineJobsAgreementSyncFailureState = new Map();
  }

  return globalThis.__nineJobsAgreementSyncFailureState;
}

function getAgreementMaintenanceState() {
  if (!globalThis.__nineJobsAgreementMaintenanceState) {
    globalThis.__nineJobsAgreementMaintenanceState = {
      pending: false,
    };
  }

  return globalThis.__nineJobsAgreementMaintenanceState;
}

export function scheduleAgreementMaintenance() {
  const maintenanceState = getAgreementMaintenanceState();

  if (maintenanceState.pending) {
    return false;
  }

  maintenanceState.pending = true;

  const schedule =
    typeof setImmediate === 'function'
      ? setImmediate
      : (callback) => setTimeout(callback, 0);

  schedule(async () => {
    try {
      await syncPendingAgreementStatuses();
      await recoverFailedInternalAgreementCompletions();
    } catch (error) {
      console.error('Agreement maintenance error:', error);
    } finally {
      maintenanceState.pending = false;
    }
  });

  return true;
}

export async function syncPendingAgreementStatuses() {
  const syncState = getAgreementSyncState();
  const now = Date.now();
  if (now - syncState.lastSyncTime < COOLDOWN_MS) {
    return 0;
  }
  syncState.lastSyncTime = now;

  if (!hasDocuSignRuntimeConfig()) {
    return 0;
  }

  await connectDB();
  const syncCutoff = new Date(now - COOLDOWN_MS);
  const agreements = await Agreement.find({
    docuSignEnvelopeId: { $nin: ['', null] },
    status: { $in: ACTIVE_DOCUSIGN_STATUSES },
    $or: [{ docuSignLastSyncedAt: null }, { docuSignLastSyncedAt: { $lte: syncCutoff } }],
  }).select('_id docuSignEnvelopeId status envelopeEvents signedAt signedPdfUrl docuSignLastSyncedAt');

  if (agreements.length) {
    const syncStartedAt = new Date(now);
    const agreementIds = agreements.map((agreementDocument) => agreementDocument._id);

    await Agreement.updateMany(
      { _id: { $in: agreementIds } },
      { $set: { docuSignLastSyncedAt: syncStartedAt } }
    );

    agreements.forEach((agreementDocument) => {
      agreementDocument.docuSignLastSyncedAt = syncStartedAt;
    });
  }

  const syncFailureState = getAgreementSyncFailureState();
  const syncableAgreements = agreements.filter((agreementDocument) => {
    const failureKey = agreementDocument.docuSignEnvelopeId || String(agreementDocument._id);
    const lastFailedAt = syncFailureState.get(failureKey);
    return !lastFailedAt || now - lastFailedAt >= COOLDOWN_MS;
  });

  await Promise.all(
    syncableAgreements.map(async (agreementDocument) => {
      const failureKey = agreementDocument.docuSignEnvelopeId || String(agreementDocument._id);
      try {
        await syncAgreementDocumentStatusFromDocuSign(agreementDocument, { timeoutMs: 3000 });
        syncFailureState.delete(failureKey);
      } catch (error) {
        syncFailureState.set(failureKey, Date.now());
        console.error(`DocuSign status sync failed for agreement ${agreementDocument._id}:`, error);
      }
    })
  );

  return syncableAgreements.length;
}

export async function recoverFailedInternalAgreementCompletions(limit = 10) {
  const syncState = getAgreementSyncState();
  if (limit > 1) {
    const now = Date.now();
    if (now - syncState.lastRecoveryTime < COOLDOWN_MS) {
      return 0;
    }
    syncState.lastRecoveryTime = now;
  }

  await connectDB();

  const agreements = await Agreement.find({
    status: 'completion_processing_failed',
    signedPdfStorageKey: '',
    auditTrailStorageKey: '',
    'clientSignature.signedAt': { $ne: null },
    'providerSignature.signedAt': { $ne: null },
  })
    .select('_id status updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit);

  let recoveredCount = 0;

  const results = await Promise.all(
    agreements.map(async (agreement) => {
      try {
        const recovered = await retryFailedAgreementCompletion(String(agreement._id));
        if (recovered?.status === 'completed') {
          return 1;
        }
      } catch (error) {
        console.error(`Agreement completion retry failed for ${agreement._id}:`, error);
      }
      return 0;
    })
  );

  recoveredCount = results.reduce((sum, val) => sum + val, 0);
  if (recoveredCount > 0) {
    invalidateAdminAgreementListCache();
  }
  return recoveredCount;
}

export async function createAgreement(payload) {
  await connectDB();
  const agreement = await Agreement.create({
    ...payload,
    notes: payload.notes || '',
    status: 'draft',
  });

  invalidateAdminAgreementListCache();
  return serializeAgreement(agreement);
}

export async function updateAgreementById(id, updates) {
  await connectDB();
  const existingAgreement = await Agreement.findById(id);

  if (!existingAgreement) {
    return null;
  }

  if (existingAgreement.status === 'completed') {
    throw new Error('Completed agreements cannot be edited.');
  }

  const agreement = await Agreement.findByIdAndUpdate(
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

  invalidateAdminAgreementListCache();
  return agreement ? serializeAgreement(agreement) : null;
}

export async function deleteAgreementById(id) {
  await connectDB();
  const result = await Agreement.findByIdAndDelete(id);
  if (result) {
    invalidateAdminAgreementListCache();
  }
  return Boolean(result);
}

export async function generateAndStoreAgreementPdf(agreementDocument) {
  const artifact = await generateAgreementPdfArtifact({
    ...agreementDocument.toObject(),
    _id: String(agreementDocument._id),
  });
  const buffer = artifact.buffer;

  const upload = await uploadPrivatePdf({
    folder: `agreements/${agreementDocument._id}`,
    fileName: 'generated-agreement.pdf',
    buffer,
    contentType: 'application/pdf',
  });

  agreementDocument.generatedPdfUrl = upload.url;
  agreementDocument.generatedPdfPath = upload.path;
  agreementDocument.pdfAnchorCoords = artifact.anchorCoords;
  agreementDocument.status = agreementDocument.status === 'draft' ? 'previewed' : agreementDocument.status;
  await agreementDocument.save();
  invalidateAdminAgreementListCache();

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

  // Unsigned / Generated variant
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

export async function attachSignedAgreementPdf(agreementDocument) {
  const signedBuffer = await downloadCompletedEnvelopePdf(agreementDocument.docuSignEnvelopeId);

  const upload = await uploadPrivatePdf({
    folder: `agreements/${agreementDocument._id}`,
    fileName: 'signed-agreement.pdf',
    buffer: signedBuffer,
    contentType: 'application/pdf',
  });

  agreementDocument.signedPdfUrl = upload.url;
  agreementDocument.signedPdfPath = upload.path;
  agreementDocument.signedAt = new Date();
  await agreementDocument.save();
  invalidateAdminAgreementListCache();

  return signedBuffer;
}
