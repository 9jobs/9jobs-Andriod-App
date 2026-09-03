import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { updateInvoicePaymentStatus } from '@/lib/invoices/service';

export async function PATCH(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const invoice = await updateInvoicePaymentStatus(id, String(payload?.paymentStatus || '').toLowerCase());

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to update invoice status.' }, { status: 400 });
  }
}
