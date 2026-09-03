import { NextResponse } from 'next/server';

import { createWeeklySubscriptionCheckout } from '@/lib/billing/service';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const session = await createWeeklySubscriptionCheckout({
      token: payload?.token,
      request,
      origin: request.nextUrl.origin,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create subscription checkout session.' }, { status: 400 });
  }
}
