import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { generateAndStoreFortnightInvoicePdf, getFortnightInvoiceDocumentById } from '@/lib/fortnight-invoices/service';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  const invoiceDocument = await getFortnightInvoiceDocumentById(id);

  if (!invoiceDocument) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const result = await generateAndStoreFortnightInvoicePdf(invoiceDocument);
  return NextResponse.json({ invoice: result.invoice }, { status: 200 });
}
