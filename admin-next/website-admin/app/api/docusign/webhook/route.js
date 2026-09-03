import { NextResponse } from 'next/server';

import { parseDocuSignWebhookPayload, verifyDocuSignWebhookSignature } from '@/lib/docusign/webhook';
import { getAgreementDocumentById, attachSignedAgreementPdf } from '@/lib/agreements/service';
import connectDB from '@/utils/db';
import Agreement from '@/models/Agreement';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rawBody = await request.text();

  if (!verifyDocuSignWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  try {
    const { payload, envelopeId, mappedStatus, rawStatus } = parseDocuSignWebhookPayload(rawBody);
    await connectDB();
    const agreementDocument = await Agreement.findOne({ docuSignEnvelopeId: envelopeId });

    if (!agreementDocument) {
      return NextResponse.json({ received: true, ignored: true });
    }

    agreementDocument.status = mappedStatus;
    agreementDocument.envelopeEvents.push({
      status: rawStatus,
      payload,
    });

    if (mappedStatus === 'completed') {
      agreementDocument.signedAt = new Date();
      await agreementDocument.save();
      await attachSignedAgreementPdf(agreementDocument);
    } else {
      await agreementDocument.save();
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('DocuSign webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
