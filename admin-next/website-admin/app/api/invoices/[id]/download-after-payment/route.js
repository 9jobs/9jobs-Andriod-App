import { NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/billing/stripe';
import {
  generateAndStoreInvoicePdf,
  getInvoiceDocumentById,
  getInvoicePdfBuffer,
} from '@/lib/invoices/service';

export async function GET(request, { params }) {
  const { id } = await params;
  const sessionId = request.nextUrl.searchParams.get('session_id') || '';

  if (!sessionId) {
    return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
  }

  const invoiceDocument = await getInvoiceDocumentById(id);

  if (!invoiceDocument) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const matchedInvoiceId = String(session?.metadata?.invoice_id || '');

  if (matchedInvoiceId !== String(id)) {
    return NextResponse.json({ error: 'This payment session does not match the requested invoice.' }, { status: 403 });
  }

  const isPaid = session?.payment_status === 'paid' || session?.status === 'complete';

  if (!isPaid) {
    return NextResponse.json({ error: 'Invoice payment is not complete yet.' }, { status: 409 });
  }

  if (!invoiceDocument.generatedPdfUrl) {
    await generateAndStoreInvoicePdf(invoiceDocument);
  }

  const buffer = await getInvoicePdfBuffer(invoiceDocument);

  if (!buffer) {
    return NextResponse.json({ error: 'Invoice PDF not found.' }, { status: 404 });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="invoice-${invoiceDocument.invoiceNumber}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
