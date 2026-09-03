import { NextResponse } from 'next/server';

import { createSuccessFeeCheckout } from '@/lib/billing/service';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const payload = await request.json();
    const result = await createSuccessFeeCheckout({
      clientId: payload?.clientId,
      amountCents: payload?.amountCents,
      actor: session.email || session.name || 'admin',
      origin: request.nextUrl.origin,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create success-fee checkout.' }, { status: 400 });
  }
}
