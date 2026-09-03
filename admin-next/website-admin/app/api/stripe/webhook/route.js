import { NextResponse } from 'next/server';

import { handleStripeWebhook } from '@/lib/billing/service';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
    }

    const body = await request.text();
    const result = await handleStripeWebhook({ body, signature });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to process Stripe webhook.' }, { status: 400 });
  }
}
