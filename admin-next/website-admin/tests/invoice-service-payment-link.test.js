import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const connectDB = jest.fn();
const findById = jest.fn();
const findByIdAndUpdate = jest.fn();
const findOneClient = jest.fn();
const createClient = jest.fn();
const customersCreate = jest.fn();
const checkoutCreate = jest.fn();

async function loadInvoiceService() {
  jest.resetModules();
  jest.doMock('@/utils/db', () => ({
    __esModule: true,
    default: connectDB,
  }));
  jest.doMock('@/models/Invoice', () => ({
    __esModule: true,
    default: {
      findById,
      findByIdAndUpdate,
    },
  }));
  jest.doMock('@/models/ClientInfo', () => ({
    __esModule: true,
    default: {
      findOne: findOneClient,
      create: createClient,
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
  jest.doMock('@/lib/invoices/defaults', () => ({
    LOCKED_INVOICE_PAYMENT_DETAILS: {
      accountName: '9 Jobs',
      bankName: '9 Jobs Pty Ltd.',
      accountNumber: '970362192',
      bsb: '083004',
    },
    applyInvoiceDefaults: (invoice) => invoice,
  }));
  jest.doMock('@/lib/invoices/serialize', () => ({
    serializeInvoice: (invoice) => invoice,
  }));
  jest.doMock('@/lib/invoices/pdf', () => ({
    generateInvoicePdfBuffer: jest.fn(),
  }));
  jest.doMock('@/lib/storage/blob', () => ({
    fetchBlobBuffer: jest.fn(),
    uploadPrivatePdf: jest.fn(),
  }));

  return import('@/lib/invoices/service');
}

describe('invoice service payment link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stores weekly autopay subscription details after Stripe marks invoice paid', async () => {
    const { markInvoicePaidFromStripe } = await loadInvoiceService();
    findByIdAndUpdate.mockResolvedValue({
      _id: 'invoice-paid-1',
      status: 'paid',
      paymentStatus: 'paid',
      stripeSubscriptionId: 'sub_weekly_123',
      stripeCustomerId: 'cus_weekly_123',
      stripeCheckoutSessionId: 'cs_weekly_123',
      stripeCheckoutUrl: 'https://checkout.stripe.com/pay/cs_weekly_123',
    });

    const result = await markInvoicePaidFromStripe({
      invoiceId: 'invoice-paid-1',
      checkoutSessionId: 'cs_weekly_123',
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_weekly_123',
      customerId: 'cus_weekly_123',
      subscriptionId: 'sub_weekly_123',
    });

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'invoice-paid-1',
      expect.objectContaining({
        status: 'paid',
        paymentStatus: 'paid',
        stripeCheckoutSessionId: 'cs_weekly_123',
        stripeCheckoutUrl: 'https://checkout.stripe.com/pay/cs_weekly_123',
        stripeCustomerId: 'cus_weekly_123',
        stripeSubscriptionId: 'sub_weekly_123',
      }),
      { new: true }
    );
    expect(result.stripeSubscriptionId).toBe('sub_weekly_123');
  });

  test('creates checkout sessions with adaptive pricing disabled and Link excluded', async () => {
    const { createInvoicePaymentLink } = await loadInvoiceService();
    const save = jest.fn();
    findOneClient.mockResolvedValue(null);
    findById.mockResolvedValue({
      _id: 'invoice-1',
      billedToName: 'Vijay Shukla',
      billedToEmail: 'client@example.com',
      billedToPhone: '+61422279428',
      invoiceNumber: '9J-202608-017',
      description: 'For Testing website',
      total: '428',
      stripeCustomerId: '',
      save,
    });
    customersCreate.mockResolvedValue({
      id: 'cus_123',
    });
    checkoutCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
      expires_at: 1786599999,
    });

    const result = await createInvoicePaymentLink('invoice-1', 'https://9jobs.co');

    expect(customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'client@example.com',
        phone: '+61422279428',
      })
    );
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
        mode: 'payment',
        success_url: 'https://9jobs.co/success?session_id={CHECKOUT_SESSION_ID}&invoice=invoice-1',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'aud',
              unit_amount: 42800,
            }),
          }),
        ],
      })
    );
    expect(save).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });

  test('creates subscription checkout for standard plan invoices and syncs weekly autopay client billing', async () => {
    const { createInvoicePaymentLink } = await loadInvoiceService();
    const saveInvoice = jest.fn();
    const saveClient = jest.fn();
    findById.mockResolvedValue({
      _id: 'invoice-standard-1',
      billedToName: 'Vijay Shukla',
      billedToEmail: 'client@example.com',
      billedToPhone: '+61422279428',
      invoiceNumber: '9J-202608-018',
      description: 'Standard Plan',
      duration: '1 WEEK',
      total: '428',
      stripeCustomerId: '',
      save: saveInvoice,
    });
    findOneClient.mockResolvedValue({
      _id: 'client-1',
      email: 'client@example.com',
      billing: {
        auditLog: [],
      },
      save: saveClient,
    });
    customersCreate.mockResolvedValue({
      id: 'cus_standard_123',
    });
    checkoutCreate.mockResolvedValue({
      id: 'cs_test_standard_123',
      url: 'https://checkout.stripe.com/pay/cs_test_standard_123',
      expires_at: 1786599999,
    });

    const result = await createInvoicePaymentLink('invoice-standard-1', 'http://localhost:3000');

    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        mode: 'subscription',
        success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}&invoice=invoice-standard-1&billing=weekly',
        metadata: expect.objectContaining({
          invoice_type: 'standard_weekly_invoice',
          client_id: 'client-1',
        }),
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            invoice_type: 'standard_weekly_invoice',
          }),
        }),
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'aud',
              unit_amount: 42800,
              recurring: {
                interval: 'week',
              },
            }),
          }),
        ],
      })
    );
    const savedClientBilling = saveClient.mock.instances[0]?.billing;
    expect(savedClientBilling?.billingState).toBe('PENDING_CHECKOUT');
    expect(savedClientBilling?.agreedWeeklyAmountCents).toBe(42800);
    expect(saveClient).toHaveBeenCalled();
    expect(saveInvoice).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_standard_123');
  });

  test('auto-creates a billing client shell for new standard plan invoices when no client match exists', async () => {
    const { createInvoicePaymentLink } = await loadInvoiceService();
    const saveInvoice = jest.fn();
    const saveClient = jest.fn();

    findById.mockResolvedValue({
      _id: 'invoice-standard-2',
      billedToName: 'Vikash Shukla',
      billedToEmail: '9jobsapplicationservice@gmail.com',
      billedToPhone: '99711 08779',
      invoiceNumber: '9J-202608-021',
      description: 'Standard Plan',
      duration: '1 WEEK',
      total: '428',
      stripeCustomerId: '',
      save: saveInvoice,
    });
    findOneClient.mockResolvedValue(null);
    createClient.mockResolvedValue({
      _id: 'client-shell-1',
      email: '9jobsapplicationservice@gmail.com',
      billing: {
        auditLog: [],
      },
      save: saveClient,
    });
    customersCreate.mockResolvedValue({
      id: 'cus_standard_shell_123',
    });
    checkoutCreate.mockResolvedValue({
      id: 'cs_test_standard_shell_123',
      url: 'https://checkout.stripe.com/pay/cs_test_standard_shell_123',
      expires_at: 1786599999,
    });

    const result = await createInvoicePaymentLink('invoice-standard-2', 'http://localhost:3000');

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Vikash Shukla',
        contactNo: '99711 08779',
        email: '9jobsapplicationservice@gmail.com',
      })
    );
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        metadata: expect.objectContaining({
          invoice_type: 'standard_weekly_invoice',
          client_id: 'client-shell-1',
        }),
      })
    );
    expect(saveClient).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_standard_shell_123');
  });
});
