import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import {
  getAgreementById,
  getAgreementDocumentById,
  generateAndStoreAgreementPdf,
  getAgreementPdfBuffer,
} from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getBaseUrl(requestUrl = '') {
  const currentOrigin = new URL(requestUrl).origin.replace(/\/$/, '');

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(currentOrigin)) {
    return currentOrigin;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_BASE_URL ||
    currentOrigin ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function createAgreementWhatsAppShareUrl(agreementDocument, signingUrl) {
  const phoneDigits = String(agreementDocument?.clientPhone || agreementDocument?.contactNumber || '').replace(/\D/g, '');
  const clientName = agreementDocument?.clientName || 'Client';
  const message = [
    `Hi ${clientName},`,
    '',
    'Thank you for choosing 9Jobs.',
    '',
    'Your agreement is ready for review and signature.',
    '',
    'Please open the secure link below:',
    signingUrl,
  ].join('\n');

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const agreementId = (await params).id;
  const agreementDocument = await getAgreementDocumentById(agreementId);

  if (!agreementDocument) {
    return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  }

  if (!agreementDocument.generatedPdfUrl) {
    await generateAndStoreAgreementPdf(agreementDocument);
  }

  if (normalizeEmail(agreementDocument.clientEmail) === normalizeEmail(agreementDocument.providerEmail)) {
    return NextResponse.json(
      { error: 'Client email and service provider email must be different for the signing flow.' },
      { status: 400 }
    );
  }

  const agreement = await getAgreementById(agreementId);
  const pdfBuffer = await getAgreementPdfBuffer(agreement, 'generated');

  try {
    const { hashPdf, generateSecureToken, hashToken } = require('@/utils/cryptoUtils');

    const originalPdfSha256 = hashPdf(pdfBuffer);
    const clientToken = generateSecureToken();
    const clientTokenHash = hashToken(clientToken);
    const providerToken = generateSecureToken();
    const providerTokenHash = hashToken(providerToken);

    agreementDocument.esignProvider = 'internal';
    agreementDocument.esignError = '';
    agreementDocument.originalPdfSha256 = originalPdfSha256;
    agreementDocument.originalPdfUrl = agreementDocument.generatedPdfUrl;
    agreementDocument.originalPdfStorageKey = agreementDocument.generatedPdfPath;

    agreementDocument.providerSigningTokenHash = providerTokenHash;
    agreementDocument.providerTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    agreementDocument.providerTokenUsedAt = null;
    agreementDocument.providerOtpHash = '';
    agreementDocument.providerOtpExpiresAt = null;
    agreementDocument.providerOtpAttempts = 0;
    agreementDocument.providerOtpCooldownUntil = null;
    agreementDocument.providerOtpVerifiedAt = null;
    agreementDocument.providerDocumentViewedAt = null;
    agreementDocument.providerInvitationSentAt = new Date();
    agreementDocument.providerCompletionEmailSentAt = null;
    agreementDocument.providerConsentAcceptedAt = null;
    agreementDocument.providerSignature = {
      name: '',
      ip: '',
      userAgent: '',
      signedAt: null,
      signatureFileKey: '',
      signatureType: '',
    };

    agreementDocument.clientSigningTokenHash = clientTokenHash;
    agreementDocument.clientTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    agreementDocument.clientTokenUsedAt = null;
    agreementDocument.clientOtpHash = '';
    agreementDocument.clientOtpExpiresAt = null;
    agreementDocument.clientOtpAttempts = 0;
    agreementDocument.clientOtpCooldownUntil = null;
    agreementDocument.clientOtpVerifiedAt = null;
    agreementDocument.clientDocumentViewedAt = null;
    agreementDocument.clientConsentAcceptedAt = null;
    agreementDocument.clientCompletionEmailSentAt = null;
    agreementDocument.clientSignature = {
      name: '',
      ip: '',
      userAgent: '',
      signedAt: null,
      signatureFileKey: '',
      signatureType: '',
    };
    agreementDocument.clientDownloadTokenHash = '';
    agreementDocument.providerDownloadTokenHash = '';
    agreementDocument.downloadTokenExpiresAt = null;
    agreementDocument.signedPdfUrl = '';
    agreementDocument.signedPdfPath = '';
    agreementDocument.signedPdfStorageKey = '';
    agreementDocument.signedPdfSha256 = '';
    agreementDocument.auditTrailUrl = '';
    agreementDocument.auditTrailStorageKey = '';
    agreementDocument.auditTrailSha256 = '';
    agreementDocument.signedAt = null;
    agreementDocument.completionLockId = '';
    agreementDocument.completionStartedAt = null;
    agreementDocument.completionAttemptCount = 0;

    agreementDocument.status = 'sent_to_client';
    agreementDocument.sentAt = new Date();
    agreementDocument.clientInvitationSentAt = new Date();

    await agreementDocument.save();

    // WhatsApp is an additional client delivery option, not a replacement for
    // the client email invitation. Both parties receive only their own
    // role-bound link, so OTPs and signatures remain tied to the right email.
    const { sendClientSigningInvite, sendProviderSigningInvite } = require('@/lib/agreements/email');
    await Promise.all([
      sendClientSigningInvite(agreementDocument, clientToken),
      sendProviderSigningInvite(agreementDocument, providerToken),
    ]);

    const signingUrl = `${getBaseUrl(request.url)}/agreements/${agreementDocument._id}/sign?token=${clientToken}`;
    const whatsappShareUrl = createAgreementWhatsAppShareUrl(agreementDocument, signingUrl);

    return NextResponse.json({
      success: true,
      signingUrl,
      whatsappShareUrl,
    });
  } catch (error) {
    console.error('Unable to prepare agreement WhatsApp link:', error);
    agreementDocument.status = 'send_failed';
    agreementDocument.esignError = error instanceof Error ? error.message : 'WhatsApp sharing failed';
    await agreementDocument.save();
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to prepare agreement WhatsApp link.',
      },
      { status: 500 }
    );
  }
}
