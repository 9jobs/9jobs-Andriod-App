import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { fortnightInvoiceInputSchema } from '@/lib/fortnight-invoices/schema';
import {
  createFortnightInvoice,
  deleteFortnightInvoiceById,
  generateAndStoreFortnightInvoicePdf,
  getFortnightInvoiceDocumentById,
  listFortnightInvoices,
  updateFortnightInvoiceById,
} from '@/lib/fortnight-invoices/service';

export async function GET(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const invoices = await listFortnightInvoices();
  return NextResponse.json({ invoices }, { status: 200 });
}

export async function POST(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const validatedPayload = fortnightInvoiceInputSchema.parse(payload);
    const invoice = await createFortnightInvoice(validatedPayload);
    const invoiceDocument = await getFortnightInvoiceDocumentById(invoice._id);

    if (!invoiceDocument) {
      return NextResponse.json({ error: 'Invoice was created but preview generation failed.' }, { status: 500 });
    }

    const result = await generateAndStoreFortnightInvoicePdf(invoiceDocument);

    return NextResponse.json(
      {
        invoice: result.invoice,
        previewUrl: `/admin/website-admin/api/fortnight-invoices/${result.invoice._id}/preview-pdf`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Fortnight invoice create failed:', error);
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
    const validatedPayload = fortnightInvoiceInputSchema.parse(updates);
    const invoice = await updateFortnightInvoiceById(id, validatedPayload);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    const invoiceDocument = await getFortnightInvoiceDocumentById(invoice._id);

    if (!invoiceDocument) {
      return NextResponse.json({ error: 'Invoice update succeeded but preview regeneration failed.' }, { status: 500 });
    }

    const result = await generateAndStoreFortnightInvoicePdf(invoiceDocument);
    return NextResponse.json({ invoice: result.invoice }, { status: 200 });
  } catch (error) {
    console.error('Fortnight invoice update failed:', error);
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

  const deleted = await deleteFortnightInvoiceById(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}
