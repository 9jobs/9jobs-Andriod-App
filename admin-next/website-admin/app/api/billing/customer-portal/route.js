import { NextResponse } from 'next/server';

import { createCustomerPortalSession } from '@/lib/billing/service';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const payload = await request.json();
    const portalSession = await createCustomerPortalSession({
      clientId: payload?.clientId,
      origin: request.nextUrl.origin,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create customer portal session.' }, { status: 400 });
  }
}
