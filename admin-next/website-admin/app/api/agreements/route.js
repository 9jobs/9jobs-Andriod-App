import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { agreementInputSchema } from '@/lib/agreements/schema';
import {
  createAgreement,
  deleteAgreementById,
  deleteAllAgreements,
  generateAndStoreAgreementPdf,
  getAgreementDocumentById,
  listAgreements,
  updateAgreementById,
} from '@/lib/agreements/service';

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
    const payload = agreementInputSchema.parse(await request.json());
    const createdAgreement = await createAgreement(payload);
    const agreementDocument = await getAgreementDocumentById(createdAgreement._id);

    if (!agreementDocument) {
      throw new Error('Agreement not found after creation.');
    }

    const result = await generateAndStoreAgreementPdf(agreementDocument);

    return NextResponse.json(
      {
        agreement: result.agreement,
        previewUrl: `/admin/website-admin/api/agreements/${result.agreement._id}/preview-pdf`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid agreement payload.' }, { status: 400 });
    }

    console.error('Unable to create agreement:', error);
    return NextResponse.json({ error: 'Unable to create agreement.' }, { status: 500 });
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
        return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
      }

      return NextResponse.json({ deleted: true }, { status: 200 });
    }

    const deletedCount = await deleteAllAgreements();

    return NextResponse.json({
      deletedCount,
      message: deletedCount ? 'Old agreements removed.' : 'No agreements found to remove.',
    });
  } catch (error) {
    console.error('Unable to remove agreements:', error);
    return NextResponse.json({ error: 'Unable to remove agreements.' }, { status: 500 });
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
    const validatedPayload = agreementInputSchema.parse(updates);
    const agreement = await updateAgreementById(id, validatedPayload);

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
    }

    const agreementDocument = await getAgreementDocumentById(agreement._id);

    if (!agreementDocument) {
      return NextResponse.json({ error: 'Agreement update succeeded but preview regeneration failed.' }, { status: 500 });
    }

    const result = await generateAndStoreAgreementPdf(agreementDocument);
    return NextResponse.json({ agreement: result.agreement }, { status: 200 });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid agreement payload.' }, { status: 400 });
    }

    console.error('Unable to update agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update agreement.' },
      { status: 400 }
    );
  }
}
