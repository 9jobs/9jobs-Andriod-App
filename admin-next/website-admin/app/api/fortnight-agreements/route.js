import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { fortnightAgreementInputSchema } from '@/lib/fortnight-agreements/schema';
import {
  createAgreement,
  deleteAgreementById,
  deleteAllAgreements,
  generateAndStoreAgreementPdf,
  getAgreementDocumentById,
  listAgreements,
  updateAgreementById,
} from '@/lib/fortnight-agreements/service';

export const dynamic = 'force-dynamic';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

export async function GET(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  const agreements = await listAgreements();

  return NextResponse.json({
    agreements,
  });
}

export async function POST(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = fortnightAgreementInputSchema.parse(await request.json());
    const createdAgreement = await createAgreement(payload);
    const agreementDocument = await getAgreementDocumentById(createdAgreement._id);

    if (!agreementDocument) {
      throw new Error('Contract not found after creation.');
    }

    const result = await generateAndStoreAgreementPdf(agreementDocument);

    return NextResponse.json(
      {
        agreement: result.agreement,
        previewUrl: `/admin/website-admin/api/fortnight-agreements/${result.agreement._id}/preview-pdf`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid contract payload.' }, { status: 400 });
    }

    console.error('Unable to create contract:', error);
    return NextResponse.json({ error: 'Unable to create contract.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const deleted = await deleteAgreementById(id);

      if (!deleted) {
        return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
      }

      return NextResponse.json({ deleted: true }, { status: 200 });
    }

    const deletedCount = await deleteAllAgreements();

    return NextResponse.json({
      deletedCount,
      message: deletedCount ? 'Old contracts removed.' : 'No contracts found to remove.',
    });
  } catch (error) {
    console.error('Unable to remove contracts:', error);
    return NextResponse.json({ error: 'Unable to remove contracts.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = await request.json();
    const { id, ...updates } = payload;
    const validatedPayload = fortnightAgreementInputSchema.parse(updates);
    const agreement = await updateAgreementById(id, validatedPayload);

    if (!agreement) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const agreementDocument = await getAgreementDocumentById(agreement._id);

    if (!agreementDocument) {
      return NextResponse.json({ error: 'Contract update succeeded but preview regeneration failed.' }, { status: 500 });
    }

    const result = await generateAndStoreAgreementPdf(agreementDocument);
    return NextResponse.json({ agreement: result.agreement }, { status: 200 });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid contract payload.' }, { status: 400 });
    }

    console.error('Unable to update contract:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update contract.' },
      { status: 400 }
    );
  }
}
