import { NextResponse } from 'next/server';

import { getBillingClientSummaryById } from '@/lib/billing/service';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const client = await getBillingClientSummaryById(id);

    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    return NextResponse.json(client, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to load billing details.' }, { status: 400 });
  }
}
