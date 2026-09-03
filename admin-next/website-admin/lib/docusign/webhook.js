import crypto from 'node:crypto';

import { mapDocuSignEnvelopeStatus } from '@/lib/docusign/status';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function verifyDocuSignWebhookSignature(rawBody, headers) {
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  const headerValue =
    headers.get('x-docusign-signature-1') ||
    headers.get('x-docusign-signature') ||
    headers.get('x-signature-1');

  if (!headerValue) {
    return false;
  }

  const digestBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const digestHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  return headerValue === digestBase64 || headerValue === digestHex;
}

export function parseDocuSignWebhookPayload(rawBody) {
  const payload = safeJsonParse(rawBody);

  if (!payload) {
    throw new Error('Invalid DocuSign webhook payload.');
  }

  const envelopeId =
    payload.envelopeId ||
    payload.data?.envelopeId ||
    payload.data?.envelopeSummary?.envelopeId ||
    payload.envelopeSummary?.envelopeId;
  const rawStatus =
    payload.status ||
    payload.envelopeStatus ||
    payload.data?.envelopeStatus ||
    payload.data?.envelopeSummary?.status ||
    payload.envelopeSummary?.status;

  if (!envelopeId || !rawStatus) {
    throw new Error('DocuSign webhook payload is missing envelope identifiers.');
  }

  return {
    payload,
    envelopeId,
    rawStatus,
    mappedStatus: mapDocuSignEnvelopeStatus(rawStatus),
  };
}
