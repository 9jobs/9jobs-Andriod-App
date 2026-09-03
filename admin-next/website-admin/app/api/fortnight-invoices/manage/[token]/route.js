import { NextResponse } from 'next/server';

import { createFortnightInvoicePortalSessionByToken } from '@/lib/fortnight-invoices/service';

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const session = await createFortnightInvoicePortalSessionByToken(token, request.nextUrl?.origin || '');
    return NextResponse.redirect(session.url);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to open billing portal.' }, { status: 400 });
  }
}
