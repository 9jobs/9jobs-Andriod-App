import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { getInvoiceById, getInvoicePdfBuffer } from '@/lib/invoices/service';

export async function GET(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const buffer = await getInvoicePdfBuffer(invoice);

  if (!buffer) {
    return NextResponse.json({ error: 'Invoice PDF not found.' }, { status: 404 });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
