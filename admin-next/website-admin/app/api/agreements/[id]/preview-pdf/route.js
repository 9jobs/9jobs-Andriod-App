import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { agreementIdParamSchema } from '@/lib/agreements/schema';
import { getAgreementById, getAgreementDocumentById, generateAndStoreAgreementPdf, getAgreementPdfBuffer } from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = agreementIdParamSchema.parse(await params);
  const variant = request.nextUrl.searchParams.get('variant') === 'signed' ? 'signed' : 'generated';
  let agreement = await getAgreementById(id);

  if (!agreement) {
    return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  }

  if (variant === 'generated' && !agreement.generatedPdfUrl) {
    const agreementDocument = await getAgreementDocumentById(id);
    const result = await generateAndStoreAgreementPdf(agreementDocument);
    agreement = result.agreement;
  }

  const pdfBuffer = await getAgreementPdfBuffer(agreement, variant);

  if (!pdfBuffer) {
    return NextResponse.json({ error: 'PDF is not available.' }, { status: 404 });
  }

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="agreement-preview.pdf"',
      'cache-control': 'private, no-store, no-cache, must-revalidate',
    },
  });
}
