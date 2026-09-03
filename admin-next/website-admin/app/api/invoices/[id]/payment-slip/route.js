import { NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/billing/stripe';
import { generatePaymentSlipPdfBuffer } from '@/lib/billing/payment-slip';
import { getInvoiceDocumentById } from '@/lib/invoices/service';

export async function GET(request, { params }) {
  const { id } = await params;
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';

  if (!sessionId) {
    return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
  }

  const invoiceDocument = await getInvoiceDocumentById(id);

  if (!invoiceDocument) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });
  const matchedInvoiceId = String(session?.metadata?.invoice_id || '');

  if (matchedInvoiceId !== String(id)) {
    return NextResponse.json({ error: 'This payment session does not match the requested invoice.' }, { status: 403 });
  }

  const isPaid = session?.payment_status === 'paid' || session?.status === 'complete';

  if (!isPaid) {
    return NextResponse.json({ error: 'Invoice payment is not complete yet.' }, { status: 409 });
  }

  const paymentIntentId =
    typeof session?.payment_intent === 'string'
      ? session.payment_intent
      : session?.payment_intent?.id || '';

  const buffer = await generatePaymentSlipPdfBuffer({
    title: 'Invoice Payment Slip',
    invoiceNumber: invoiceDocument.invoiceNumber,
    invoiceDescription: invoiceDocument.description,
    billedToName: invoiceDocument.billedToName,
    billedToEmail: invoiceDocument.billedToEmail,
    amountCents: session?.amount_total || 0,
    currency: session?.currency || 'aud',
    paymentDate: session?.created ? session.created * 1000 : '',
    paymentStatus: 'paid',
    paymentReference: session?.id || '',
    paymentIntentId,
    subscriptionId: session?.subscription || '',
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="payment-slip-${invoiceDocument.invoiceNumber}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
