import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

jest.setTimeout(120000);

const createdInvoiceIds = [];
let connectDB;
let FortnightInvoice;
let createFortnightInvoice;
let createFortnightInvoiceCheckout;
let getFortnightInvoiceDocumentById;
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
  const invoice = await createFortnightInvoice({
    invoiceNumber: `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    invoiceDate: now,
    billedToName: 'Stripe Test Client',
    billedToEmail: '9jobsapplicationservice@gmail.com',
    billedToPhone: '+61422279428',
    monthLabel: '1',
    issuedDate: now,
    validUntil: '2026-09-17',
    dueDate: '2026-08-18',
    description: 'Monthly Service',
    duration: '1 MONTH',
    total: '200',
    ...overrides,
  });

  createdInvoiceIds.push(invoice._id);
  return getFortnightInvoiceDocumentById(invoice._id);
}

beforeAll(async () => {
  loadEnvFromFile();

  ({ default: connectDB } = await import('@/utils/db'));
  ({ default: FortnightInvoice } = await import('@/models/FortnightInvoice'));
  ({
    createFortnightInvoice,
    createFortnightInvoiceCheckout,
    getFortnightInvoiceDocumentById,
  } = await import('@/lib/fortnight-invoices/service'));
  ({ getStripeClient } = await import('@/lib/billing/stripe'));
});

describe('fortnight invoice Stripe checkout integration', () => {
  test('creates a one-time Stripe checkout for upfront fortnight invoices', async () => {
    const stripe = getStripeClient();
    const invoiceDocument = await createTestInvoice({
      description: 'Upfront Fees',
      duration: 'ONE TIME',
      total: '150',
    });

    const checkout = await createFortnightInvoiceCheckout(invoiceDocument, 'http://localhost:3000');
    const session = await stripe.checkout.sessions.retrieve(checkout.checkoutSessionId);

    expect(checkout.paymentMode).toBe('upfront');
    expect(session.mode).toBe('payment');
    expect(session.customer).toBeTruthy();
  });

  test('creates a subscription Stripe checkout for monthly fortnight autopay invoices', async () => {
    const stripe = getStripeClient();
    const invoiceDocument = await createTestInvoice({
      description: 'Fortnight Monthly Plan',
      duration: '1 MONTH',
      total: '200',
    });

    const checkout = await createFortnightInvoiceCheckout(invoiceDocument, 'http://localhost:3000');
    const session = await stripe.checkout.sessions.retrieve(checkout.checkoutSessionId);

    expect(checkout.paymentMode).toBe('monthly_autopay');
    expect(session.mode).toBe('subscription');
    expect(session.customer).toBeTruthy();
  });
});

afterAll(async () => {
  await connectDB();

  if (createdInvoiceIds.length > 0) {
    await FortnightInvoice.deleteMany({ _id: { $in: createdInvoiceIds } });
  }
});
