import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { createFortnightInvoicePaymentLink } from '@/lib/fortnight-invoices/service';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const origin = request.nextUrl?.origin || new URL(request.url).origin;
    const result = await createFortnightInvoicePaymentLink(id, origin);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to generate payment link.' }, { status: 400 });
  }
}
