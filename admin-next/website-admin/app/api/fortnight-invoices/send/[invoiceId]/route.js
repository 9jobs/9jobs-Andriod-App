import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import {
  generateAndStoreFortnightInvoicePdf,
  getFortnightInvoiceDocumentById,
  getFortnightInvoicePdfBuffer,
  markFortnightInvoiceSent,
} from '@/lib/fortnight-invoices/service';

function createMailer() {
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailPass) {
    throw new Error('GMAIL_PASS is not defined.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: '9jobsapplicationservice@gmail.com',
      pass: gmailPass,
    },
  });
}

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { invoiceId } = await params;
    const invoiceDocument = await getFortnightInvoiceDocumentById(invoiceId);

    if (!invoiceDocument) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    if (!invoiceDocument.generatedPdfUrl) {
      await generateAndStoreFortnightInvoicePdf(invoiceDocument);
    }

    const pdfBuffer = await getFortnightInvoicePdfBuffer(invoiceDocument);

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Invoice PDF not found.' }, { status: 404 });
    }

    const transporter = createMailer();

    await transporter.sendMail({
      from: '"9 Jobs" <9jobsapplicationservice@gmail.com>',
      to: invoiceDocument.billedToEmail,
      subject: `Service Invoice between ${invoiceDocument.billedToName} and 9Jobs`,
      html: `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; line-height: 1.5; max-width: 600px;">
  <p>Hi ${invoiceDocument.billedToName},</p>
  <p>Please find attached your AUD $${invoiceDocument.total} invoice for ${invoiceDocument.description} (${invoiceDocument.invoiceNumber}), due on ${invoiceDocument.dueDate}.</p>
  <p>Kindly complete the payment before the due date and reply to this email with the payment confirmation so we can continue with your service without any delays. If you've already made the payment, please disregard this email.</p>
  <p>Kind regards,<br>
  9Jobs Application Service Team<br>
  M: +61 422 279 428</p>
</div>
`,
      attachments: [
        {
          filename: `Invoice_${invoiceDocument.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    const invoice = await markFortnightInvoiceSent(invoiceId);
    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error('Fortnight invoice email send failed:', error);
    return NextResponse.json({ error: 'Unable to send invoice email.' }, { status: 500 });
  }
}
