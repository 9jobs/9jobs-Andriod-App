import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { generateBillingLinkForClient } from '@/lib/billing/service';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const result = await generateBillingLinkForClient(
      id,
      session.email || session.name || 'admin',
      request.nextUrl.origin
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to generate billing link.' }, { status: 400 });
  }
}
