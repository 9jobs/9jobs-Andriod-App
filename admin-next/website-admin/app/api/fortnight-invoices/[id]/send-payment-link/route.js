import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { createFortnightInvoicePaymentLink, getFortnightInvoiceDocumentById } from '@/lib/fortnight-invoices/service';

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

function buildPaymentLinkEmailHtml(invoice, checkoutUrl, paymentMode) {
  const modeCopy = paymentMode === 'monthly_autopay'
    ? 'Your first monthly payment will activate automatic monthly billing until cancelled.'
    : 'This is an upfront one-time invoice and will not activate autopay.';

  return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; line-height: 1.5; max-width: 600px;">
  <p>Hi ${invoice.billedToName},</p>
  <p>Thank you for choosing 9Jobs.</p>
  <p>Please find your payment details below:</p>
  <p><strong>Plan:</strong> ${invoice.description}<br />
  <strong>Amount:</strong> AUD $${invoice.total}</p>
  <p>${modeCopy}</p>
  <p>You can complete your payment securely using the link below:</p>
  <p><a href="${checkoutUrl}">Payment Now</a></p>
  <p>Once the payment is completed, you will also have the option to download your invoice and payment receipt for your records.</p>
  <p>If you have any questions regarding the payment or your plan, please feel free to contact our team.</p>
  <p>Kind regards,<br />
  9Jobs Team<br />
  <a href="https://9jobs.co/">https://9jobs.co/</a><br />
  +61 422 279 428</p>
</div>
`;
}

export async function POST(request, { params }) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const invoice = await getFortnightInvoiceDocumentById(id);

    if (!invoice) {
      return NextResponse.json({ error: 'Fortnight invoice not found.' }, { status: 404 });
    }

    const origin = request.nextUrl?.origin || new URL(request.url).origin;
    const { checkoutUrl, whatsappShareUrl, paymentMode } = await createFortnightInvoicePaymentLink(id, origin);
    const transporter = createMailer();

    await transporter.sendMail({
      from: '"9 Jobs" <9jobsapplicationservice@gmail.com>',
      to: invoice.billedToEmail,
      subject: '9Jobs Payment Details',
      html: buildPaymentLinkEmailHtml(invoice, checkoutUrl, paymentMode),
    });

    return NextResponse.json({ checkoutUrl, whatsappShareUrl, paymentMode }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to send payment link email.' }, { status: 500 });
  }
}
