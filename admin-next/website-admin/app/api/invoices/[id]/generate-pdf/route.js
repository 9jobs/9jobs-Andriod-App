import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { generateAndStoreInvoicePdf, getInvoiceDocumentById } from '@/lib/invoices/service';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  const invoiceDocument = await getInvoiceDocumentById(id);

  if (!invoiceDocument) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const result = await generateAndStoreInvoicePdf(invoiceDocument);
  return NextResponse.json({ invoice: result.invoice }, { status: 200 });
}
