import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

jest.setTimeout(120000);

const createdInvoiceIds = [];
let connectDB;
let Invoice;
let createInvoice;
let createInvoicePaymentLink;
let getInvoiceDocumentById;
let getStripeClient;

function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }

    const [rawKey, ...rest] = line.split('=');
    const key = rawKey?.trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = rest.join('=').trim();
  }
}

async function createTestInvoice(overrides = {}) {
  const now = '2026-08-17';
  const invoice = await createInvoice({
    invoiceNumber: `TEST-W-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    invoiceDate: now,
    billedToName: 'Stripe Weekly Client',
    billedToEmail: '9jobsapplicationservice@gmail.com',
    billedToPhone: '+61422279428',
    weekLabel: '1',
    issuedDate: now,
    validUntil: '2026-08-24',
    dueDate: '2026-08-18',
    description: 'Standard Plan',
    duration: '1 WEEK',
    total: '200',
    ...overrides,
  });

  createdInvoiceIds.push(invoice._id);
  return getInvoiceDocumentById(invoice._id);
}

beforeAll(async () => {
  loadEnvFromFile();

  ({ default: connectDB } = await import('@/utils/db'));
  ({ default: Invoice } = await import('@/models/Invoice'));
  ({
    createInvoice,
    createInvoicePaymentLink,
    getInvoiceDocumentById,
  } = await import('@/lib/invoices/service'));
  ({ getStripeClient } = await import('@/lib/billing/stripe'));
});

describe('weekly invoice Stripe checkout integration', () => {
  test('creates a subscription Stripe checkout for standard weekly invoices', async () => {
    const stripe = getStripeClient();
    const invoiceDocument = await createTestInvoice({
      description: 'Standard Plan',
      duration: '1 WEEK',
      total: '200',
    });

    const checkout = await createInvoicePaymentLink(invoiceDocument._id, 'http://localhost:3000');
    const session = await stripe.checkout.sessions.retrieve(checkout.invoice.stripeCheckoutSessionId || checkout.invoice.stripeCheckoutSessionId);

    expect(checkout.checkoutUrl).toBeTruthy();
    expect(session.mode).toBe('subscription');
    expect(session.customer).toBeTruthy();
  });
});

afterAll(async () => {
  await connectDB();

  if (createdInvoiceIds.length > 0) {
    await Invoice.deleteMany({ _id: { $in: createdInvoiceIds } });
  }
});
