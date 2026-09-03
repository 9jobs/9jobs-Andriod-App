import { NextResponse } from 'next/server';

import { cancelClientSubscription } from '@/lib/billing/service';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const payload = await request.json();
    const subscription = await cancelClientSubscription({
      clientId: payload?.clientId,
      actor: session.email || session.name || 'admin',
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to cancel subscription.' }, { status: 400 });
  }
}
