import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { agreementIdParamSchema } from '@/lib/agreements/schema';
import { getAgreementDocumentById, generateAndStoreAgreementPdf } from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = agreementIdParamSchema.parse(await params);
  const agreementDocument = await getAgreementDocumentById(id);

  if (!agreementDocument) {
    return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  }

  const result = await generateAndStoreAgreementPdf(agreementDocument);

  return NextResponse.json({
    agreement: result.agreement,
    previewUrl: `/admin/website-admin/api/agreements/${id}/preview-pdf`,
  });
}
