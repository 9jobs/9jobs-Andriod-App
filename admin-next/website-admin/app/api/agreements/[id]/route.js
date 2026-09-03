import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { agreementIdParamSchema } from '@/lib/agreements/schema';
import { getAgreementById } from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const session = await requireAdminApiSession(_request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = agreementIdParamSchema.parse(await params);
  const agreement = await getAgreementById(id);

  if (!agreement) {
    return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  }

  return NextResponse.json({ agreement });
}
