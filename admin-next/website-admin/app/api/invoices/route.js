import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { invoiceInputSchema } from '@/lib/invoices/schema';
import {
  createInvoice,
  deleteInvoiceById,
  generateAndStoreInvoicePdf,
  getInvoiceDocumentById,
  listInvoices,
  updateInvoiceById,
} from '@/lib/invoices/service';

export async function GET(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const invoices = await listInvoices();
  return NextResponse.json({ invoices }, { status: 200 });
}

export async function POST(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const validatedPayload = invoiceInputSchema.parse(payload);
    const invoice = await createInvoice(validatedPayload);
    const invoiceDocument = await getInvoiceDocumentById(invoice._id);

    if (!invoiceDocument) {
      return NextResponse.json({ error: 'Invoice was created but preview generation failed.' }, { status: 500 });
    }

    const result = await generateAndStoreInvoicePdf(invoiceDocument);

    return NextResponse.json(
      {
        invoice: result.invoice,
        previewUrl: `/admin/website-admin/api/invoices/${result.invoice._id}/preview-pdf`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invoice create failed:', error);
    return NextResponse.json({ error: 'Unable to create invoice.' }, { status: 400 });
  }
}

export async function PATCH(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { id, ...updates } = payload;
    const validatedPayload = invoiceInputSchema.parse(updates);
    const invoice = await updateInvoiceById(id, validatedPayload);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    const invoiceDocument = await getInvoiceDocumentById(invoice._id);

    if (!invoiceDocument) {
      return NextResponse.json({ error: 'Invoice update succeeded but preview regeneration failed.' }, { status: 500 });
    }

    const result = await generateAndStoreInvoicePdf(invoiceDocument);
    return NextResponse.json({ invoice: result.invoice }, { status: 200 });
  } catch (error) {
    console.error('Invoice update failed:', error);
    return NextResponse.json({ error: 'Unable to update invoice.' }, { status: 400 });
  }
}

export async function DELETE(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Invoice id is required.' }, { status: 400 });
  }

  const deleted = await deleteInvoiceById(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}
