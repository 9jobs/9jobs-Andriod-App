import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { createDocuSignEnvelope } from '@/lib/docusign/client';
import { resolveEsignProvider } from '@/lib/agreements/provider';
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

function isBrowserFormSubmission(request) {
  const contentType = request.headers.get('content-type') || '';
  return contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
}

function redirectToAgreementDetail(agreementId) {
  // Keep native form fallback requests inside the host admin proxy origin.
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/admin/website-admin/agreements/${agreementId}`,
    },
  });
}

export async function POST(request, { params }) {
  const browserFormSubmission = isBrowserFormSubmission(request);
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const agreementId = (await params).agreementId;
  const agreementDocument = await getAgreementDocumentById(agreementId);

  if (!agreementDocument) {
    return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  }

  // The action can be retried after a browser refresh. Do not create a second
  // invitation or make a duplicate delivery request for the same client.
  if (agreementDocument.status === 'sent_to_client' && agreementDocument.clientInvitationSentAt) {
    if (browserFormSubmission) {
      return redirectToAgreementDetail(agreementId);
    }

    return NextResponse.json({
      success: true,
      message: 'Agreement invitation has already been sent to the client.',
    });
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

  const hostname = new URL(request.url).hostname;
  const selectedProvider = resolveEsignProvider({
    configuredProvider: process.env.ESIGN_PROVIDER,
    hostname,
  });
  const useDocuSign = selectedProvider === 'docusign';

  console.info(
    '[agreement-send]',
    JSON.stringify({
      deploymentEnvironment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      selectedProvider,
      agreementId,
      routeBranch: useDocuSign ? 'docusign' : 'internal',
      hostname,
    })
  );

  if (useDocuSign) {
    try {
      const envelope = await createDocuSignEnvelope({
        agreement,
        pdfBuffer,
      });

      agreementDocument.docuSignEnvelopeId = envelope.envelopeId;
      agreementDocument.status = 'sent';
      agreementDocument.sentAt = new Date();
      agreementDocument.esignProvider = 'docusign';
      agreementDocument.envelopeEvents.push({
        status: 'sent',
        payload: envelope,
      });
      await agreementDocument.save();

      if (browserFormSubmission) {
        return redirectToAgreementDetail(agreementId);
      }

      return NextResponse.json({
        success: true,
        envelopeId: envelope.envelopeId,
      });
    } catch (error) {
      console.error('Unable to send agreement via DocuSign:', error);
      agreementDocument.status = 'send_failed';
      agreementDocument.esignError = error instanceof Error ? error.message : 'DocuSign sending failed';
      await agreementDocument.save();
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Unable to send agreement via DocuSign.',
        },
        { status: 500 }
      );
    }
  }

  // Internal E-Signature Workflow
  try {
    const { hashPdf, generateSecureToken, hashToken } = require('@/utils/cryptoUtils');
    const { sendClientSigningInvite, sendProviderSigningInvite } = require('@/lib/agreements/email');

    const originalPdfSha256 = hashPdf(pdfBuffer);
    const clientToken = generateSecureToken();
    const clientTokenHash = hashToken(clientToken);
    const providerToken = generateSecureToken();
    const providerTokenHash = hashToken(providerToken);

    // Save tokens and PDF hashes in document
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
    agreementDocument.clientTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
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

    // Each party receives an independent, role-bound link. Neither can sign
    // the other party's signature field.
    await Promise.all([
      sendClientSigningInvite(agreementDocument, clientToken),
      sendProviderSigningInvite(agreementDocument, providerToken),
    ]);

    if (browserFormSubmission) {
      return redirectToAgreementDetail(agreementId);
    }

    return NextResponse.json({
      success: true,
      message: 'Agreement sent to client successfully.',
    });
  } catch (error) {
    console.error('Unable to send agreement internally:', error);
    agreementDocument.status = 'send_failed';
    agreementDocument.esignError = error instanceof Error ? error.message : 'Internal sending failed';
    await agreementDocument.save();
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initialize electronic signature request.',
      },
      { status: 500 }
    );
  }
}
