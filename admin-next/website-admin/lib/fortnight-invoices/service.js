import connectDB from '@/utils/db';
import FortnightInvoice from '@/models/FortnightInvoice';
import { applyFortnightInvoiceDefaults, LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS } from '@/lib/fortnight-invoices/defaults';
import { serializeFortnightInvoice } from '@/lib/fortnight-invoices/serialize';
import { generateFortnightInvoicePdfBuffer } from '@/lib/fortnight-invoices/pdf';
import { fetchBlobBuffer, uploadPrivatePdf } from '@/lib/storage/blob';
import { constantTimeCompare, generateSecureToken, hashToken } from '@/utils/cryptoUtils';
import { getStripeClient } from '@/lib/billing/stripe';
import { getHostedCheckoutCustomerCaptureConfig } from '@/lib/billing/checkout';

function formatDateOnly(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getBaseUrl(origin = '') {
  const normalizedOrigin = String(origin || '').replace(/\/$/, '');

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)) {
    return normalizedOrigin;
  }

  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    normalizedOrigin ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function normalizeInvoiceText(value) {
  return String(value || '').trim().toLowerCase();
}

export function inferFortnightInvoicePaymentMode(invoice) {
  const description = normalizeInvoiceText(invoice?.description);
  const duration = normalizeInvoiceText(invoice?.duration);
  const monthLabel = normalizeInvoiceText(invoice?.monthLabel);
  const upfrontLike =
    description.includes('upfront') ||
    description.includes('up front') ||
    description.includes('up-front') ||
    description.includes('upfont') ||
    description.includes('up font') ||
    duration.includes('upfront') ||
    duration.includes('up front') ||
    duration.includes('up-front') ||
    duration.includes('upfont') ||
    duration.includes('up font') ||
    duration.includes('one time') ||
    duration.includes('one-time');

  if (upfrontLike) {
    return 'upfront';
  }

  if (duration.includes('month') || monthLabel.length > 0) {
    return 'monthly_autopay';
  }

  return 'upfront';
}

function parseAmountToCents(total) {
  const numeric = Number(String(total || '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('A valid fortnight invoice total is required.');
  }

  return Math.round(numeric * 100);
}

function buildFortnightSuccessUrl(paymentMode, baseUrl, invoiceId) {
  const billingType = paymentMode === 'monthly_autopay' ? 'fortnight-monthly' : 'fortnight-upfront';
  return `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&billing=${billingType}&invoice=${invoiceId}`;
}

function buildFortnightEmailHtml(invoiceDocument, checkoutUrl, paymentMode, portalManageUrl) {
  const amountLabel = `AUD $${invoiceDocument.total}`;
  const recurringCopy = paymentMode === 'monthly_autopay'
    ? `<p>This monthly invoice will activate automatic monthly billing after the first successful payment. You can cancel future autopay from the billing management link below or through admin support.</p>`
    : `<p>This is an upfront one-time invoice only. No autopay will be activated from this payment.</p>`;
  const portalCopy = paymentMode === 'monthly_autopay'
    ? `<p>Manage or cancel future monthly autopay here after payment: <a href="${portalManageUrl}">${portalManageUrl}</a></p>`
    : '';

  return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; line-height: 1.5; max-width: 600px;">
  <p>Hi ${invoiceDocument.billedToName},</p>
  <p>Please find attached your ${amountLabel} invoice for ${invoiceDocument.description} (${invoiceDocument.invoiceNumber}), due on ${invoiceDocument.dueDate}.</p>
  ${recurringCopy}
  <p>Complete your payment securely using this link: <a href="${checkoutUrl}">${checkoutUrl}</a></p>
  ${portalCopy}
  <p>Kind regards,<br>
  9Jobs Application Service Team<br>
  M: +61 422 279 428</p>
</div>
`;
}

function createFortnightWhatsAppShareUrl(invoiceDocument, checkoutUrl) {
  const phoneDigits = String(invoiceDocument?.billedToPhone || '').replace(/\D/g, '');
  const amountLabel = `AUD $${invoiceDocument.total}`;
  const message = [
    `Hi ${invoiceDocument.billedToName},`,
    '',
    'Thank you for choosing 9Jobs.',
    '',
    `Plan: ${invoiceDocument.description}`,
    `Amount: ${amountLabel}`,
    '',
    'Complete your payment securely using the link below:',
    checkoutUrl,
  ].join('\n');

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export async function listFortnightInvoices() {
  await connectDB();
  const invoices = await FortnightInvoice.find(
    {},
    'invoiceNumber invoiceDate billedToName billedToEmail dueDate total status paymentStatus createdAt description paidAt sentAt'
  )
    .sort({ createdAt: -1 })
    .lean();
  return invoices.map(serializeFortnightInvoice);
}

export async function createFortnightInvoice(payload) {
  await connectDB();
  const paymentMode = inferFortnightInvoicePaymentMode(payload);
  const invoice = await FortnightInvoice.create({
    ...payload,
    ...LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS,
    paymentMode,
    autopayStatus: paymentMode === 'monthly_autopay' ? 'pending_checkout' : 'not_applicable',
    paymentStatus: 'pending',
    status: 'draft',
  });

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoice));
}

export async function updateFortnightInvoiceById(id, updates) {
  await connectDB();
  const paymentMode = inferFortnightInvoicePaymentMode(updates);
  const invoice = await FortnightInvoice.findByIdAndUpdate(
    id,
    {
      ...updates,
      ...LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS,
      paymentMode,
      autopayStatus: paymentMode === 'monthly_autopay' ? 'pending_checkout' : 'not_applicable',
      generatedPdfUrl: '',
      generatedPdfPath: '',
      stripeCheckoutSessionId: '',
      stripeCheckoutUrl: '',
      stripeCustomerId: '',
      stripeSubscriptionId: '',
      stripePaymentIntentId: '',
      paymentStatus: 'pending',
      paymentLinkTokenHash: '',
      paymentLinkIssuedAt: null,
      paymentLinkSentAt: null,
      paidAt: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      autopayCancelRequestedAt: null,
      autopayCancelledAt: null,
      status: 'draft',
      sentAt: null,
    },
    { new: true }
  );

  return invoice ? applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoice)) : null;
}

export async function deleteFortnightInvoiceById(id) {
  await connectDB();
  const result = await FortnightInvoice.findByIdAndDelete(id);
  return Boolean(result);
}

export async function getFortnightInvoiceById(id) {
  await connectDB();
  const invoice = await FortnightInvoice.findById(id);
  return invoice ? applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoice)) : null;
}

export async function getFortnightInvoiceDocumentById(id) {
  await connectDB();
  return FortnightInvoice.findById(id);
}

export async function findFortnightInvoiceByPaymentToken(token) {
  await connectDB();
  const tokenHash = hashToken(token);
  const invoice = await FortnightInvoice.findOne({ paymentLinkTokenHash: tokenHash });

  if (!invoice) {
    return null;
  }

  if (!constantTimeCompare(invoice.paymentLinkTokenHash || '', tokenHash)) {
    return null;
  }

  return invoice;
}

export async function generateAndStoreFortnightInvoicePdf(invoiceDocument) {
  const buffer = await generateFortnightInvoicePdfBuffer({
    ...applyFortnightInvoiceDefaults(invoiceDocument.toObject()),
    _id: String(invoiceDocument._id),
  });

  let generatedPdfUrl = '';
  let generatedPdfPath = '';

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const upload = await uploadPrivatePdf({
        folder: `fortnight-invoices/${invoiceDocument._id}`,
        fileName: 'generated-fortnight-invoice.pdf',
        buffer,
      });
      generatedPdfUrl = upload.url;
      generatedPdfPath = upload.path;
    } else {
      generatedPdfUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;
      generatedPdfPath = `db://fortnight-invoices/${invoiceDocument._id}/generated-fortnight-invoice.pdf`;
    }
  } catch (error) {
    console.error('Failed to upload fortnight invoice PDF, falling back to db storage:', error);
    generatedPdfUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;
    generatedPdfPath = `db://fortnight-invoices/${invoiceDocument._id}/generated-fortnight-invoice.pdf`;
  }

  invoiceDocument.generatedPdfUrl = generatedPdfUrl;
  invoiceDocument.generatedPdfPath = generatedPdfPath;
  invoiceDocument.accountName = invoiceDocument.accountName || LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.accountName;
  invoiceDocument.bankName = invoiceDocument.bankName || LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.bankName;
  invoiceDocument.accountNumber = invoiceDocument.accountNumber || LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.accountNumber;
  invoiceDocument.bsb = invoiceDocument.bsb || LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS.bsb;
  invoiceDocument.status = invoiceDocument.status === 'draft' ? 'previewed' : invoiceDocument.status;
  await invoiceDocument.save();

  return {
    invoice: applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument)),
    buffer,
  };
}

export async function getFortnightInvoicePdfBuffer(invoice) {
  if (!invoice?.generatedPdfUrl) {
    return null;
  }

  if (invoice.generatedPdfUrl.startsWith('data:application/pdf;base64,')) {
    const base64Data = invoice.generatedPdfUrl.substring(invoice.generatedPdfUrl.indexOf(',') + 1);
    return Buffer.from(base64Data, 'base64');
  }

  return fetchBlobBuffer(invoice.generatedPdfUrl);
}

export async function markFortnightInvoiceSent(id) {
  await connectDB();
  const invoice = await FortnightInvoice.findByIdAndUpdate(
    id,
    {
      status: 'sent',
      sentAt: new Date(),
    },
    { new: true }
  );

  return invoice ? serializeFortnightInvoice(invoice) : null;
}

async function ensureFortnightStripeCustomer(invoiceDocument) {
  const stripe = getStripeClient();
  const paymentMode = inferFortnightInvoicePaymentMode(invoiceDocument);

  if (invoiceDocument.stripeCustomerId) {
    return invoiceDocument.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: invoiceDocument.billedToEmail,
    name: invoiceDocument.billedToName,
    phone: invoiceDocument.billedToPhone,
    metadata: {
      fortnight_invoice_id: String(invoiceDocument._id),
      invoice_number: invoiceDocument.invoiceNumber,
      payment_mode: paymentMode,
    },
  });

  invoiceDocument.stripeCustomerId = customer.id;
  return customer.id;
}

export async function createFortnightInvoiceCheckout(invoiceDocument, origin = '') {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(origin);
  const paymentMode = inferFortnightInvoicePaymentMode(invoiceDocument);
  const amountCents = parseAmountToCents(invoiceDocument.total);
  const paymentToken = generateSecureToken();
  const customerId = await ensureFortnightStripeCustomer(invoiceDocument);

  const metadata = {
    fortnight_invoice_id: String(invoiceDocument._id),
    invoice_number: invoiceDocument.invoiceNumber,
    payment_mode: paymentMode,
    billed_to_email: invoiceDocument.billedToEmail,
  };

  const commonPayload = {
    adaptive_pricing: {
      enabled: false,
    },
    wallet_options: {
      link: {
        display: 'never',
      },
    },
    ...getHostedCheckoutCustomerCaptureConfig(),
    customer: customerId,
    client_reference_id: String(invoiceDocument._id),
    metadata,
    success_url: buildFortnightSuccessUrl(paymentMode, baseUrl, invoiceDocument._id),
    cancel_url: `${baseUrl}/admin/fortnight-invoices/${invoiceDocument._id}`,
  };

  let session;

  if (paymentMode === 'monthly_autopay') {
    session = await stripe.checkout.sessions.create({
      ...commonPayload,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'aud',
            unit_amount: amountCents,
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `9Jobs ${invoiceDocument.description}`,
              description: `${invoiceDocument.description} - first monthly invoice paid today, then charged automatically each month until cancelled.`,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata,
      },
    });
  } else {
    session = await stripe.checkout.sessions.create({
      ...commonPayload,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'aud',
            unit_amount: amountCents,
            product_data: {
              name: `9Jobs ${invoiceDocument.description}`,
              description: `${invoiceDocument.description} upfront invoice payment.`,
            },
          },
          quantity: 1,
        },
      ],
    });
  }

  invoiceDocument.paymentMode = paymentMode;
  invoiceDocument.autopayStatus = paymentMode === 'monthly_autopay' ? 'pending_checkout' : 'not_applicable';
  invoiceDocument.stripeCheckoutSessionId = session.id;
  invoiceDocument.stripeCheckoutUrl = session.url || '';
  invoiceDocument.paymentLinkTokenHash = hashToken(paymentToken);
  invoiceDocument.paymentLinkIssuedAt = new Date();
  invoiceDocument.paymentLinkSentAt = new Date();
  await invoiceDocument.save();

  return {
    paymentMode,
    checkoutUrl: session.url || '',
    checkoutSessionId: session.id,
    customerId,
    portalManageUrl: `${baseUrl}/api/fortnight-invoices/manage/${paymentToken}`,
  };
}

export async function createFortnightInvoicePaymentLink(invoiceId, origin = '') {
  await connectDB();
  const invoiceDocument = await FortnightInvoice.findById(invoiceId);

  if (!invoiceDocument) {
    throw new Error('Fortnight invoice not found.');
  }

  const checkout = await createFortnightInvoiceCheckout(invoiceDocument, origin);

  return {
    ...checkout,
    whatsappShareUrl: createFortnightWhatsAppShareUrl(invoiceDocument, checkout.checkoutUrl),
    invoice: applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument)),
  };
}

export async function createFortnightInvoicePortalSessionByToken(token, origin = '') {
  const invoiceDocument = await findFortnightInvoiceByPaymentToken(token);

  if (!invoiceDocument) {
    throw new Error('This billing management link is invalid.');
  }

  if (!invoiceDocument.stripeCustomerId) {
    throw new Error('No Stripe customer has been linked yet for this invoice.');
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: invoiceDocument.stripeCustomerId,
    return_url: `${getBaseUrl(origin)}/success?billing=fortnight-manage`,
  });

  return {
    invoiceId: String(invoiceDocument._id),
    url: session.url,
  };
}

export async function cancelFortnightInvoiceAutopayById(id) {
  await connectDB();
  const invoiceDocument = await FortnightInvoice.findById(id);

  if (!invoiceDocument) {
    throw new Error('Fortnight invoice not found.');
  }

  if (!invoiceDocument.stripeSubscriptionId) {
    throw new Error('No active fortnight autopay subscription is linked to this invoice.');
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.update(invoiceDocument.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  invoiceDocument.autopayStatus = 'cancel_at_period_end';
  invoiceDocument.cancelAtPeriodEnd = true;
  invoiceDocument.autopayCancelRequestedAt = new Date();
  invoiceDocument.currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : invoiceDocument.currentPeriodEnd;
  await invoiceDocument.save();

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

export async function markFortnightInvoicePaidFromStripe({
  invoiceId,
  checkoutSessionId = '',
  paymentIntentId = '',
  customerId = '',
  subscriptionId = '',
}) {
  await connectDB();
  const invoiceDocument = await FortnightInvoice.findById(invoiceId);

  if (!invoiceDocument) {
    return null;
  }

  if (checkoutSessionId) {
    invoiceDocument.stripeCheckoutSessionId = checkoutSessionId;
  }
  if (paymentIntentId) {
    invoiceDocument.stripePaymentIntentId = paymentIntentId;
  }
  if (customerId) {
    invoiceDocument.stripeCustomerId = customerId;
  }
  if (subscriptionId) {
    invoiceDocument.stripeSubscriptionId = subscriptionId;
  }

  invoiceDocument.status = 'paid';
  invoiceDocument.paymentStatus = 'paid';
  invoiceDocument.paidAt = new Date();
  invoiceDocument.autopayStatus = invoiceDocument.paymentMode === 'monthly_autopay' ? 'active' : 'not_applicable';
  await invoiceDocument.save();

  if (
    !invoiceDocument.generatedPdfUrl &&
    typeof invoiceDocument.toObject === 'function' &&
    typeof invoiceDocument.save === 'function'
  ) {
    await generateAndStoreFortnightInvoicePdf(invoiceDocument);
  }

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

export async function markFortnightInvoicePaymentFailedFromStripe({ invoiceId, paymentIntentId = '' }) {
  await connectDB();
  const invoiceDocument = await FortnightInvoice.findById(invoiceId);

  if (!invoiceDocument) {
    return null;
  }

  if (paymentIntentId) {
    invoiceDocument.stripePaymentIntentId = paymentIntentId;
  }

  invoiceDocument.status = 'payment_failed';
  invoiceDocument.paymentStatus = 'failed';
  invoiceDocument.autopayStatus = invoiceDocument.paymentMode === 'monthly_autopay' ? 'payment_failed' : 'not_applicable';
  await invoiceDocument.save();

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

export async function markFortnightInvoiceSubscriptionUpdatedFromStripe({
  invoiceId,
  subscriptionId = '',
  customerId = '',
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
  status = '',
}) {
  await connectDB();
  const invoiceDocument = await FortnightInvoice.findById(invoiceId);

  if (!invoiceDocument) {
    return null;
  }

  if (subscriptionId) {
    invoiceDocument.stripeSubscriptionId = subscriptionId;
  }
  if (customerId) {
    invoiceDocument.stripeCustomerId = customerId;
  }

  invoiceDocument.cancelAtPeriodEnd = Boolean(cancelAtPeriodEnd);
  invoiceDocument.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : invoiceDocument.currentPeriodEnd;

  if (status === 'canceled') {
    invoiceDocument.autopayStatus = 'cancelled';
    invoiceDocument.status = 'cancelled';
    invoiceDocument.paymentStatus = 'failed';
    invoiceDocument.autopayCancelledAt = new Date();
  } else if (cancelAtPeriodEnd) {
    invoiceDocument.autopayStatus = 'cancel_at_period_end';
  } else if (invoiceDocument.paymentMode === 'monthly_autopay') {
    invoiceDocument.autopayStatus = 'active';
  }

  await invoiceDocument.save();

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

async function findFortnightInvoiceByStripeReference({ subscriptionId = '', customerId = '' }) {
  await connectDB();

  if (subscriptionId) {
    const bySubscription = await FortnightInvoice.findOne({ stripeSubscriptionId: subscriptionId });
    if (bySubscription) {
      return bySubscription;
    }
  }

  if (customerId) {
    return FortnightInvoice.findOne({ stripeCustomerId: customerId }).sort({ createdAt: -1 });
  }

  return null;
}

export async function markFortnightInvoiceRenewalPaidFromStripe({
  subscriptionId = '',
  customerId = '',
  currentPeriodEnd = null,
}) {
  const invoiceDocument = await findFortnightInvoiceByStripeReference({ subscriptionId, customerId });

  if (!invoiceDocument) {
    return null;
  }

  invoiceDocument.status = 'paid';
  invoiceDocument.paymentStatus = 'paid';
  invoiceDocument.autopayStatus = 'active';
  invoiceDocument.cancelAtPeriodEnd = false;
  invoiceDocument.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : invoiceDocument.currentPeriodEnd;
  await invoiceDocument.save();

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

export async function markFortnightInvoiceRenewalFailedFromStripe({
  subscriptionId = '',
  customerId = '',
}) {
  const invoiceDocument = await findFortnightInvoiceByStripeReference({ subscriptionId, customerId });

  if (!invoiceDocument) {
    return null;
  }

  invoiceDocument.status = 'payment_failed';
  invoiceDocument.paymentStatus = 'failed';
  invoiceDocument.autopayStatus = 'payment_failed';
  await invoiceDocument.save();

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

export async function updateFortnightInvoicePaymentStatus(id, nextPaymentStatus) {
  await connectDB();

  if (!['paid', 'pending'].includes(nextPaymentStatus)) {
    throw new Error('Invalid payment status.');
  }

  const invoiceDocument = await FortnightInvoice.findById(id);

  if (!invoiceDocument) {
    return null;
  }

  invoiceDocument.paymentStatus = nextPaymentStatus;

  if (nextPaymentStatus === 'paid') {
    invoiceDocument.status = 'paid';
    invoiceDocument.paidAt = new Date();
  } else {
    invoiceDocument.status = invoiceDocument.sentAt ? 'sent' : 'draft';
    invoiceDocument.paidAt = null;
  }

  await invoiceDocument.save();

  return applyFortnightInvoiceDefaults(serializeFortnightInvoice(invoiceDocument));
}

export async function suggestNextFortnightInvoiceDetails() {
  await connectDB();
  const latestInvoice = await FortnightInvoice.findOne({})
    .sort({ _id: -1 })
    .select('invoiceNumber')
    .lean();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `9JF-${year}${month}-`;

  let nextNum = 1;

  if (latestInvoice?.invoiceNumber) {
    const match = latestInvoice.invoiceNumber.match(/9JF-\d{6}-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  const nextInvoiceNumber = `${prefix}${paddedNum}`;
  const invoiceDate = formatDateOnly(now);
  const validUntil = formatDateOnly(addMonths(now, 1));
  const dueDate = formatDateOnly(addDays(now, 1));

  return {
    invoiceNumber: nextInvoiceNumber,
    invoiceDate,
    issuedDate: invoiceDate,
    validUntil,
    dueDate,
    billedToName: '',
    billedToEmail: '',
    billedToPhone: '',
    monthLabel: '1',
    description: '',
    duration: '1 MONTH',
    total: '150',
  };
}
