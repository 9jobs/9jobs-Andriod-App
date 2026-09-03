import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { getAgreementById, getAgreementPdfBuffer } from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const agreementId = (await params).agreementId;
  const agreement = await getAgreementById(agreementId);

  if (!agreement) {
    return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  }

  const pdfBuffer = await getAgreementPdfBuffer(agreement, 'signed');

  if (!pdfBuffer) {
    return NextResponse.json({ error: 'Signed PDF is not available yet.' }, { status: 404 });
  }

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="9jobs-signed-agreement-${agreementId}.pdf"`,
      'cache-control': 'private, no-store, no-cache, must-revalidate',
    },
  });
}
