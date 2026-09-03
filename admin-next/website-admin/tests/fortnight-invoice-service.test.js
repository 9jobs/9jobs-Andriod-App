import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const connectDB = jest.fn();
const findOne = jest.fn();
const findById = jest.fn();
const customersCreate = jest.fn();
const checkoutCreate = jest.fn();

async function loadFortnightInvoiceService() {
  jest.resetModules();
  jest.doMock('@/utils/db', () => ({
    __esModule: true,
    default: connectDB,
  }));
  jest.doMock('@/models/FortnightInvoice', () => ({
    __esModule: true,
    default: {
      findOne,
      findById,
    },
  }));
  jest.doMock('@/lib/billing/stripe', () => ({
    getStripeClient: () => ({
      customers: {
        create: customersCreate,
      },
      checkout: {
        sessions: {
          create: checkoutCreate,
        },
      },
    }),
  }));
  jest.doMock('@/lib/fortnight-invoices/defaults', () => ({
    LOCKED_FORTNIGHT_INVOICE_PAYMENT_DETAILS: {
      accountName: '9 Jobs',
      bankName: '9 Jobs Pty Ltd.',
      accountNumber: '970362192',
      bsb: '083004',
    },
    applyFortnightInvoiceDefaults: (invoice) => invoice,
  }));
  jest.doMock('@/lib/fortnight-invoices/serialize', () => ({
    serializeFortnightInvoice: (invoice) => invoice,
  }));
  jest.doMock('@/lib/fortnight-invoices/pdf', () => ({
    generateFortnightInvoicePdfBuffer: jest.fn(),
  }));
  jest.doMock('@/lib/storage/blob', () => ({
    fetchBlobBuffer: jest.fn(),
    uploadPrivatePdf: jest.fn(),
  }));

  return import('@/lib/fortnight-invoices/service');
}

describe('fortnight invoice service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-14T10:00:00.000Z'));
  });

  test('suggests month-based defaults for one-time fortnight invoices', async () => {
    findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const { suggestNextFortnightInvoiceDetails } = await loadFortnightInvoiceService();
    const result = await suggestNextFortnightInvoiceDetails();

    expect(result).toMatchObject({
      invoiceNumber: '9JF-202608-001',
      invoiceDate: '2026-08-14',
      issuedDate: '2026-08-14',
      dueDate: '2026-08-15',
      monthLabel: '1',
      duration: '1 MONTH',
      total: '150',
    });
    expect(result.validUntil).toBe('2026-09-14');
  });

  test('detects upfront fortnight invoices as one-time payments', async () => {
    findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    const { inferFortnightInvoicePaymentMode } = await loadFortnightInvoiceService();

    expect(
      inferFortnightInvoicePaymentMode({
        description: 'Upfront Fees',
        duration: 'ONE TIME',
        monthLabel: '1',
      })
    ).toBe('upfront');
  });

  test('detects typo variants like upfont fees as one-time payments', async () => {
    findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    const { inferFortnightInvoicePaymentMode } = await loadFortnightInvoiceService();

    expect(
      inferFortnightInvoicePaymentMode({
        description: 'Upfont fees',
        duration: '1 MONTH',
        monthLabel: '1',
      })
    ).toBe('upfront');
  });

  test('detects monthly fortnight invoices as autopay subscriptions', async () => {
    findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    const { inferFortnightInvoicePaymentMode } = await loadFortnightInvoiceService();

    expect(
      inferFortnightInvoicePaymentMode({
        description: 'Fortnight Plan Monthly Service',
        duration: '1 MONTH',
        monthLabel: '1',
      })
    ).toBe('monthly_autopay');
  });

  test('disables Link wallet and adaptive pricing for monthly autopay checkout sessions', async () => {
    const save = jest.fn();
    const { createFortnightInvoiceCheckout } = await loadFortnightInvoiceService();

    customersCreate.mockResolvedValue({
      id: 'cus_fortnight_123',
    });
    checkoutCreate.mockResolvedValue({
      id: 'cs_fortnight_123',
      url: 'https://checkout.stripe.com/pay/cs_fortnight_123',
    });

    const invoiceDocument = {
      _id: 'fortnight-1',
      invoiceNumber: '9JF-202608-010',
      billedToName: 'Fortnight Client',
      billedToEmail: 'client@example.com',
      billedToPhone: '+61422279428',
      description: 'Fortnight Plan',
      duration: '1 MONTH',
      monthLabel: '1',
      total: '250',
      stripeCustomerId: '',
      save,
    };

    const result = await createFortnightInvoiceCheckout(invoiceDocument, 'http://localhost:3000');

    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptive_pricing: {
          enabled: false,
        },
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        wallet_options: {
          link: {
            display: 'never',
          },
        },
        mode: 'subscription',
      })
    );
    expect(result.paymentMode).toBe('monthly_autopay');
    expect(save).toHaveBeenCalled();
  });

  test('recalculates stale monthly_autopay records as one-time when current invoice says upfont fees', async () => {
    const save = jest.fn();
    const { createFortnightInvoiceCheckout } = await loadFortnightInvoiceService();

    customersCreate.mockResolvedValue({
      id: 'cus_fortnight_upfront_123',
    });
    checkoutCreate.mockResolvedValue({
      id: 'cs_fortnight_upfront_123',
      url: 'https://checkout.stripe.com/pay/cs_fortnight_upfront_123',
    });

    const invoiceDocument = {
      _id: 'fortnight-2',
      invoiceNumber: '9JF-202608-011',
      billedToName: 'Vijay',
      billedToEmail: '9jobsapplicationservice@gmail.com',
      billedToPhone: '+61422279428',
      description: 'Upfont fees',
      duration: '1 MONTH',
      monthLabel: '1',
      total: '250',
      paymentMode: 'monthly_autopay',
      stripeCustomerId: '',
      save,
    };

    const result = await createFortnightInvoiceCheckout(invoiceDocument, 'http://localhost:3000');

    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
      })
    );
    expect(result.paymentMode).toBe('upfront');
    expect(invoiceDocument.paymentMode).toBe('upfront');
    expect(save).toHaveBeenCalled();
  });
});
