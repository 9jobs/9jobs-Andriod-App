import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { cancelFortnightInvoiceAutopayById } from '@/lib/fortnight-invoices/service';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const invoice = await cancelFortnightInvoiceAutopayById(id);
    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to cancel autopay.' }, { status: 400 });
  }
}
