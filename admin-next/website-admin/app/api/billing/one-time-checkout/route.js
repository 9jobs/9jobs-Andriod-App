import { NextResponse } from 'next/server';

import { createOneTimePlanCheckout, createSuccessBasedOnboardingCheckout } from '@/lib/billing/service';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const origin = request.nextUrl.origin;

    if (payload?.token) {
      const session = await createSuccessBasedOnboardingCheckout({
        token: payload.token,
        origin,
      });
      return NextResponse.json({ url: session.url }, { status: 200 });
    }

    const session = await createOneTimePlanCheckout({
      planName: payload?.planName,
      origin,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create checkout session.' }, { status: 400 });
  }
}
