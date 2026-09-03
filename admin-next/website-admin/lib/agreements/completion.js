import crypto from 'node:crypto';

import connectDB from '@/utils/db';
import Agreement from '@/models/Agreement';
import { hashPdf, hashToken, generateSecureToken } from '@/utils/cryptoUtils';
import { uploadPrivatePdf, fetchBlobBuffer, fetchBlobBufferByKey, deleteStoredFileByKey } from '@/lib/storage/blob';
import { sendAgreementCompletedEmail } from '@/lib/agreements/email';
import { sealAgreementPdf } from '@/utils/pdfSealer';
import { generateAuditTrail } from '@/utils/auditTrail';

function getOriginalPdfLocation(agreement) {
  return agreement.originalPdfStorageKey || agreement.generatedPdfPath || '';
}

async function readOriginalPdfBuffer(agreement) {
  const originalKey = getOriginalPdfLocation(agreement);
  if (originalKey) {
    return fetchBlobBufferByKey(originalKey);
  }

  const originalUrl = agreement.originalPdfUrl || agreement.generatedPdfUrl;
  if (!originalUrl) {
    throw new Error('Original PDF storage location is missing.');
  }

  if (originalUrl.startsWith('data:application/pdf;base64,')) {
    const base64Data = originalUrl.substring(originalUrl.indexOf(',') + 1);
    return Buffer.from(base64Data, 'base64');
  }

  return fetchBlobBuffer(originalUrl);
}

export async function executeFinalSealing(agreement) {
  await connectDB();

  const lockId = crypto.randomUUID();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const lockedAgreement = await Agreement.findOneAndUpdate(
    {
      _id: agreement._id,
      status: 'completion_processing',
      $or: [
        { completionLockId: '' },
        { completionStartedAt: { $lt: fiveMinutesAgo } },
      ],
    },
    {
      $set: {
        completionLockId: lockId,
        completionStartedAt: new Date(),
      },
      $inc: { completionAttemptCount: 1 },
    },
    { new: true }
  );

  if (!lockedAgreement) {
    return null;
  }

  try {
    const originalBuffer = await readOriginalPdfBuffer(lockedAgreement);
    const currentOriginalHash = hashPdf(originalBuffer);

    if (lockedAgreement.originalPdfSha256 && lockedAgreement.originalPdfSha256 !== currentOriginalHash) {
      throw new Error('Document Integrity Failure: Original PDF checksum mismatch.');
    }

    const sealedPdfBuffer = await sealAgreementPdf(originalBuffer, lockedAgreement);
    const signedPdfSha256 = hashPdf(sealedPdfBuffer);

    const signedUpload = await uploadPrivatePdf({
      folder: `agreements/${lockedAgreement._id}`,
      fileName: 'signed-agreement.pdf',
      buffer: sealedPdfBuffer,
      contentType: 'application/pdf',
    });

    lockedAgreement.signedPdfUrl = signedUpload.url;
    lockedAgreement.signedPdfStorageKey = signedUpload.path;
    lockedAgreement.signedPdfSha256 = signedPdfSha256;

    const { buffer: auditBuffer, hash: auditHash } = generateAuditTrail(lockedAgreement);
    const auditUpload = await uploadPrivatePdf({
      folder: `agreements/${lockedAgreement._id}`,
      fileName: 'audit-trail.json',
      buffer: auditBuffer,
      contentType: 'application/json',
    });

    lockedAgreement.auditTrailUrl = auditUpload.url;
    lockedAgreement.auditTrailStorageKey = auditUpload.path;
    lockedAgreement.auditTrailSha256 = auditHash;

    const clientDownloadToken = generateSecureToken();
    const providerDownloadToken = generateSecureToken();

    lockedAgreement.clientDownloadTokenHash = hashToken(clientDownloadToken);
    lockedAgreement.providerDownloadTokenHash = hashToken(providerDownloadToken);
    lockedAgreement.downloadTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    lockedAgreement.status = 'completed';
    lockedAgreement.completedAt = new Date();
    lockedAgreement.signedAt = new Date();
    lockedAgreement.completionLockId = '';
    lockedAgreement.esignError = '';
    await lockedAgreement.save();

    const keysToDelete = [];
    if (lockedAgreement.clientSignature.signatureFileKey) {
      keysToDelete.push(lockedAgreement.clientSignature.signatureFileKey);
    }
    if (lockedAgreement.providerSignature.signatureFileKey) {
      keysToDelete.push(lockedAgreement.providerSignature.signatureFileKey);
    }

    for (const key of keysToDelete) {
      try {
        await deleteStoredFileByKey(key);
      } catch (cleanupErr) {
        console.error(`Failed to clean up temporary signature key ${key}:`, cleanupErr);
      }
    }

    if (!lockedAgreement.clientCompletionEmailSentAt) {
      try {
        await sendAgreementCompletedEmail({
          email: lockedAgreement.clientEmail,
          name: lockedAgreement.clientName,
          agreement: lockedAgreement,
          pdfBuffer: sealedPdfBuffer,
          downloadToken: clientDownloadToken,
        });
        lockedAgreement.clientCompletionEmailSentAt = new Date();
        await lockedAgreement.save();
      } catch (err) {
        console.error('Failed to email completed agreement to client:', err);
      }
    }

    if (!lockedAgreement.providerCompletionEmailSentAt) {
      try {
        await sendAgreementCompletedEmail({
          email: lockedAgreement.providerEmail,
          name: lockedAgreement.providerSignatureName,
          agreement: lockedAgreement,
          pdfBuffer: sealedPdfBuffer,
          downloadToken: providerDownloadToken,
        });
        lockedAgreement.providerCompletionEmailSentAt = new Date();
        await lockedAgreement.save();
      } catch (err) {
        console.error('Failed to email completed agreement to provider:', err);
      }
    }

    return lockedAgreement;
  } catch (err) {
    console.error('Error during agreement completion sealing:', err);
    await Agreement.updateOne(
      { _id: lockedAgreement._id, completionLockId: lockId },
      {
        $set: {
          status: 'completion_processing_failed',
          esignError: err instanceof Error ? err.message : 'Unknown completion error',
          completionLockId: '',
        },
      }
    );
    throw err;
  }
}

export async function retryFailedAgreementCompletion(agreementId) {
  await connectDB();

  const agreement = await Agreement.findOneAndUpdate(
    {
      _id: agreementId,
      status: 'completion_processing_failed',
    },
    {
      $set: {
        status: 'completion_processing',
        esignError: '',
      },
    },
    { new: true }
  );

  if (!agreement) {
    const existingAgreement = await Agreement.findById(agreementId);
    if (!existingAgreement) {
      throw new Error('Agreement not found.');
    }
    if (existingAgreement.status === 'completed') {
      return existingAgreement;
    }
    throw new Error(`Agreement is not retryable from status "${existingAgreement.status}".`);
  }

  if (!agreement.clientSignature?.signedAt || !agreement.providerSignature?.signedAt) {
    throw new Error('Stored signatures are incomplete; retry is not possible.');
  }

  if (!getOriginalPdfLocation(agreement) && !agreement.originalPdfUrl && !agreement.generatedPdfUrl) {
    throw new Error('Original PDF is missing; retry is not possible.');
  }

  await executeFinalSealing(agreement);
  return Agreement.findById(agreementId);
}
