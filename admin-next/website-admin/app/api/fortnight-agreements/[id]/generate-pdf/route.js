import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { fortnightAgreementIdParamSchema } from '@/lib/fortnight-agreements/schema';
import { getAgreementDocumentById, generateAndStoreAgreementPdf } from '@/lib/fortnight-agreements/service';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = fortnightAgreementIdParamSchema.parse(await params);
  const agreementDocument = await getAgreementDocumentById(id);

  if (!agreementDocument) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  const result = await generateAndStoreAgreementPdf(agreementDocument);

  return NextResponse.json({
    agreement: result.agreement,
    previewUrl: `/admin/website-admin/api/fortnight-agreements/${id}/preview-pdf`,
  });
}
