import connectDB from '@/utils/db';
import Invoice from '@/models/Invoice';
import ClientInfo from '@/models/ClientInfo';
import { applyInvoiceDefaults, LOCKED_INVOICE_PAYMENT_DETAILS } from '@/lib/invoices/defaults';
import { serializeInvoice } from '@/lib/invoices/serialize';
import { generateInvoicePdfBuffer } from '@/lib/invoices/pdf';
import { fetchBlobBuffer, uploadPrivatePdf } from '@/lib/storage/blob';
import { getStripeClient } from '@/lib/billing/stripe';
import { getHostedCheckoutCustomerCaptureConfig } from '@/lib/billing/checkout';
import { BILLING_PLAN_TYPES, BILLING_STATES } from '@/lib/billing/constants';

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

function parseAmountToCents(total) {
  const numeric = Number(String(total || '').replace(/[^0-9.]/g, ''));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('A valid invoice total is required.');
  }

  return Math.round(numeric * 100);
}

export function isStandardWeeklyInvoice(invoice) {
  const description = String(invoice?.description || '').trim().toLowerCase();
  const duration = String(invoice?.duration || '').trim().toLowerCase();
  const isWeeklyPlan = description.includes('standard plan') || description.includes('weekly plan');
  return isWeeklyPlan && duration.includes('week');
}

function formatCurrency(amountCents, currency = 'aud') {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((amountCents || 0) / 100);
}

function createWhatsAppShareUrl(invoice, checkoutUrl) {
  const phoneDigits = String(invoice?.billedToPhone || '').replace(/\D/g, '');
  const amountLabel = `AUD $${invoice.total}`;
  const message = [
    `Hi ${invoice.billedToName},`,
    '',
    'Thank you for choosing 9Jobs.',
    '',
    `Plan: ${invoice.description}`,
    `Amount: ${amountLabel}`,
    '',
    'Complete your payment securely using the link below:',
    checkoutUrl,
  ].join('\n');

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

async function ensureInvoiceStripeCustomer(invoiceDocument) {
  const stripe = getStripeClient();

  if (invoiceDocument.stripeCustomerId) {
    return invoiceDocument.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: invoiceDocument.billedToEmail,
    name: invoiceDocument.billedToName,
    phone: invoiceDocument.billedToPhone,
    metadata: {
      invoice_id: String(invoiceDocument._id),
      invoice_number: invoiceDocument.invoiceNumber,
    },
  });

  invoiceDocument.stripeCustomerId = customer.id;
  return customer.id;
}

async function findOrCreateWeeklyBillingClient(invoiceDocument, amountCents) {
  let client = await ClientInfo.findOne({ email: invoiceDocument.billedToEmail });

  if (!client) {
    client = await ClientInfo.create({
      fullName: invoiceDocument.billedToName,
      contactNo: invoiceDocument.billedToPhone,
      workingRights: 'Pending update',
      address: 'Pending update',
      dob: '1990-01-01',
      expectedSalary: 'Pending update',
      preferredJobLocation: 'Pending update',
      workType: 'Full-time',
      noticePeriod: 'Pending update',
      email: invoiceDocument.billedToEmail,
      password: 'TempPassword@123',
      preferredRole: 'Pending update',
      billing: {
        auditLog: [],
      },
    });
  }

  client.billing.planType = BILLING_PLAN_TYPES.STANDARD_WEEKLY;
  client.billing.planLabel = 'Standard Plan';
  client.billing.billingState = BILLING_STATES.PENDING_CHECKOUT;
  client.billing.agreedWeeklyAmountCents = amountCents;
  client.billing.currency = 'aud';
  client.billing.billingFrequency = 'week';
  client.billing.auditLog.push({
    type: 'invoice_payment_link_created',
    message: 'Created weekly invoice checkout link.',
    actor: 'admin',
    source: 'admin',
    metadata: {
      invoiceId: String(invoiceDocument._id),
      invoiceNumber: invoiceDocument.invoiceNumber,
    },
    createdAt: new Date(),
  });

  return client;
}

export async function listInvoices() {
  await connectDB();
  const invoices = await Invoice.find(
    {},
    'invoiceNumber invoiceDate billedToName billedToEmail dueDate total status paymentStatus createdAt sentAt paidAt'
  )
    .sort({ createdAt: -1 })
    .lean();
  return invoices.map(serializeInvoice);
}

export async function createInvoice(payload) {
  await connectDB();
  const invoice = await Invoice.create({
    ...payload,
    ...LOCKED_INVOICE_PAYMENT_DETAILS,
    paymentStatus: 'pending',
    status: 'draft',
  });

  return applyInvoiceDefaults(serializeInvoice(invoice));
}

export async function updateInvoiceById(id, updates) {
  await connectDB();
  const invoice = await Invoice.findByIdAndUpdate(
    id,
    {
      ...updates,
      ...LOCKED_INVOICE_PAYMENT_DETAILS,
      generatedPdfUrl: '',
      generatedPdfPath: '',
      paymentStatus: 'pending',
      status: 'draft',
      sentAt: null,
    },
    { new: true }
  );

  return invoice ? applyInvoiceDefaults(serializeInvoice(invoice)) : null;
}

export async function deleteInvoiceById(id) {
  await connectDB();
  const result = await Invoice.findByIdAndDelete(id);
  return Boolean(result);
}

export async function getInvoiceById(id) {
  await connectDB();
  const invoice = await Invoice.findById(id);
  return invoice ? applyInvoiceDefaults(serializeInvoice(invoice)) : null;
}

export async function getInvoiceDocumentById(id) {
  await connectDB();
  return Invoice.findById(id);
}

export async function generateAndStoreInvoicePdf(invoiceDocument) {
  const buffer = await generateInvoicePdfBuffer({
    ...applyInvoiceDefaults(invoiceDocument.toObject()),
    _id: String(invoiceDocument._id),
  });

  let generatedPdfUrl = '';
  let generatedPdfPath = '';

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const upload = await uploadPrivatePdf({
        folder: `invoices/${invoiceDocument._id}`,
        fileName: 'generated-invoice.pdf',
        buffer,
      });
      generatedPdfUrl = upload.url;
      generatedPdfPath = upload.path;
    } else {
      generatedPdfUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;
      generatedPdfPath = `db://invoices/${invoiceDocument._id}/generated-invoice.pdf`;
    }
  } catch (error) {
    console.error('Failed to upload invoice PDF, falling back to db storage:', error);
    generatedPdfUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;
    generatedPdfPath = `db://invoices/${invoiceDocument._id}/generated-invoice.pdf`;
  }

  invoiceDocument.generatedPdfUrl = generatedPdfUrl;
  invoiceDocument.generatedPdfPath = generatedPdfPath;
  invoiceDocument.accountName = invoiceDocument.accountName || LOCKED_INVOICE_PAYMENT_DETAILS.accountName;
  invoiceDocument.bankName = invoiceDocument.bankName || LOCKED_INVOICE_PAYMENT_DETAILS.bankName;
  invoiceDocument.accountNumber = invoiceDocument.accountNumber || LOCKED_INVOICE_PAYMENT_DETAILS.accountNumber;
  invoiceDocument.bsb = invoiceDocument.bsb || LOCKED_INVOICE_PAYMENT_DETAILS.bsb;
  invoiceDocument.status = invoiceDocument.status === 'draft' ? 'previewed' : invoiceDocument.status;
  await invoiceDocument.save();

  return {
    invoice: applyInvoiceDefaults(serializeInvoice(invoiceDocument)),
    buffer,
  };
}

export async function getInvoicePdfBuffer(invoice) {
  if (!invoice?.generatedPdfUrl) {
    return null;
  }

  if (invoice.generatedPdfUrl.startsWith('data:application/pdf;base64,')) {
    const base64Data = invoice.generatedPdfUrl.substring(invoice.generatedPdfUrl.indexOf(',') + 1);
    return Buffer.from(base64Data, 'base64');
  }

  return fetchBlobBuffer(invoice.generatedPdfUrl);
}

export async function markInvoiceSent(id) {
  await connectDB();
  const invoice = await Invoice.findByIdAndUpdate(
    id,
    {
      status: 'sent',
      sentAt: new Date(),
    },
    { new: true }
  );

  return invoice ? serializeInvoice(invoice) : null;
}

export async function markInvoicePaidFromStripe({
  invoiceId = '',
  checkoutSessionId = '',
  checkoutUrl = '',
  customerId = '',
  subscriptionId = '',
} = {}) {
  if (!invoiceId) {
    return null;
  }

  await connectDB();
  const invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      status: 'paid',
      sentAt: new Date(),
      paidAt: new Date(),
      paymentStatus: 'paid',
      ...(checkoutSessionId ? { stripeCheckoutSessionId: checkoutSessionId } : {}),
      ...(checkoutUrl ? { stripeCheckoutUrl: checkoutUrl } : {}),
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
    { new: true }
  );

  if (
    invoice &&
    !invoice.generatedPdfUrl &&
    typeof invoice.toObject === 'function' &&
    typeof invoice.save === 'function'
  ) {
    await generateAndStoreInvoicePdf(invoice);
  }

  return invoice ? serializeInvoice(invoice) : null;
}

export async function markInvoicePaymentFailedFromStripe() {
  return null;
}

export async function markInvoiceCheckoutExpiredFromStripe() {
  return null;
}

export async function createInvoicePaymentLink(invoiceId, origin = '') {
  await connectDB();
  const invoiceDocument = await Invoice.findById(invoiceId);

  if (!invoiceDocument) {
    throw new Error('Invoice not found.');
  }

  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(origin);
  const amountCents = parseAmountToCents(invoiceDocument.total);
  const standardWeekly = isStandardWeeklyInvoice(invoiceDocument);
  const stripeCustomerId = await ensureInvoiceStripeCustomer(invoiceDocument);

  let session;

  if (standardWeekly) {
    const client = await findOrCreateWeeklyBillingClient(invoiceDocument, amountCents);
    client.billing.stripeCustomerId = stripeCustomerId;

    session = await stripe.checkout.sessions.create({
      adaptive_pricing: {
        enabled: false,
      },
      wallet_options: {
        link: {
          display: 'never',
        },
      },
      ...getHostedCheckoutCustomerCaptureConfig(),
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: String(client._id),
      line_items: [
        {
          price_data: {
            currency: 'aud',
            unit_amount: amountCents,
            recurring: {
              interval: 'week',
            },
            product_data: {
              name: '9Jobs Standard Plan',
              description: `${formatCurrency(amountCents)} due today, then the same amount every week until cancelled.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: String(invoiceDocument._id),
        invoice_number: invoiceDocument.invoiceNumber,
        invoice_type: 'standard_weekly_invoice',
        client_id: String(client._id),
      },
      subscription_data: {
        metadata: {
          invoice_id: String(invoiceDocument._id),
          invoice_type: 'standard_weekly_invoice',
          client_id: String(client._id),
        },
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&invoice=${invoiceId}&billing=weekly`,
      cancel_url: `${baseUrl}/admin/invoices/${invoiceId}`,
    });

    client.billing.checkoutSessionId = session.id;
    await client.save();
  } else {
    session = await stripe.checkout.sessions.create({
      adaptive_pricing: {
        enabled: false,
      },
      wallet_options: {
        link: {
          display: 'never',
        },
      },
      ...getHostedCheckoutCustomerCaptureConfig(),
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            unit_amount: amountCents,
            product_data: {
              name: `9Jobs ${invoiceDocument.description}`,
              description: `${invoiceDocument.description} invoice payment.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: String(invoiceDocument._id),
        invoice_number: invoiceDocument.invoiceNumber,
        invoice_type: 'manual_invoice',
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&invoice=${invoiceId}`,
      cancel_url: `${baseUrl}/admin/invoices/${invoiceId}`,
    });
  }

  invoiceDocument.stripeCustomerId = stripeCustomerId;
  invoiceDocument.stripeCheckoutSessionId = session.id;
  invoiceDocument.stripeCheckoutUrl = session.url || '';
  invoiceDocument.paymentStatus = 'pending';
  await invoiceDocument.save();

  return {
    checkoutUrl: session.url || '',
    whatsappShareUrl: createWhatsAppShareUrl(invoiceDocument, session.url || ''),
    invoice: applyInvoiceDefaults(serializeInvoice(invoiceDocument)),
  };
}

export async function updateInvoicePaymentStatus(id, nextPaymentStatus) {
  await connectDB();

  if (!['paid', 'pending'].includes(nextPaymentStatus)) {
    throw new Error('Invalid payment status.');
  }

  const invoiceDocument = await Invoice.findById(id);

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

  return applyInvoiceDefaults(serializeInvoice(invoiceDocument));
}

export async function suggestNextInvoiceDetails() {
  await connectDB();
  const latestInvoice = await Invoice.findOne({})
    .sort({ _id: -1 })
    .select('invoiceNumber')
    .lean();

  // Calculate current date details
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `9J-${year}${month}-`;

  let nextNum = 17; // Default start if no database records

  if (latestInvoice?.invoiceNumber) {
    const match = latestInvoice.invoiceNumber.match(/9J-\d{6}-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  const nextInvoiceNumber = `${prefix}${paddedNum}`;

  const todayStr = now.toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const validUntilStr = nextWeek.toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const dueStr = tomorrow.toISOString().split('T')[0];

  return {
    invoiceNumber: nextInvoiceNumber,
    invoiceDate: todayStr,
    issuedDate: todayStr,
    validUntil: validUntilStr,
    dueDate: dueStr,
    billedToName: '',
    billedToEmail: '',
    billedToPhone: '',
    weekLabel: '1',
    description: '',
    duration: '1 WEEK',
    total: '150',
  };
}
