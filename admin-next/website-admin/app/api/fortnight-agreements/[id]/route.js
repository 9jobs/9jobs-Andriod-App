import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { fortnightAgreementIdParamSchema } from '@/lib/fortnight-agreements/schema';
import { getAgreementById } from '@/lib/fortnight-agreements/service';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const session = await requireAdminApiSession(_request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = fortnightAgreementIdParamSchema.parse(await params);
  const agreement = await getAgreementById(id);

  if (!agreement) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  return NextResponse.json({ agreement });
}
