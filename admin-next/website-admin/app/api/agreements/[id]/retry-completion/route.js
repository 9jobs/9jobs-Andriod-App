import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { retryFailedAgreementCompletion } from '@/lib/agreements/completion';
import { agreementIdParamSchema } from '@/lib/agreements/schema';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { id } = agreementIdParamSchema.parse(await params);
    const agreement = await retryFailedAgreementCompletion(id);

    return NextResponse.json({
      success: true,
      agreementId: String(agreement._id),
      status: agreement.status,
      signedPdfStorageKey: Boolean(agreement.signedPdfStorageKey),
      auditTrailStorageKey: Boolean(agreement.auditTrailStorageKey),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Completion retry failed.',
      },
      { status: 400 }
    );
  }
}
