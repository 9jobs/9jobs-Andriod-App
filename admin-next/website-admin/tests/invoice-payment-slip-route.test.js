import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getInvoiceDocumentById = jest.fn();
const retrieveSession = jest.fn();
const generatePaymentSlipPdfBuffer = jest.fn();

async function loadRoute() {
  jest.resetModules();
  jest.doMock('@/lib/invoices/service', () => ({
    getInvoiceDocumentById,
  }));
  jest.doMock('@/lib/billing/stripe', () => ({
    getStripeClient: () => ({
      checkout: {
        sessions: {
          retrieve: retrieveSession,
        },
      },
    }),
  }));
  jest.doMock('@/lib/billing/payment-slip', () => ({
    generatePaymentSlipPdfBuffer,
  }));

  return import('@/app/api/invoices/[id]/payment-slip/route');
}

describe('invoice payment-slip route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('downloads a paid invoice payment slip pdf', async () => {
    const { GET } = await loadRoute();
    getInvoiceDocumentById.mockResolvedValue({
      _id: 'invoice-1',
      invoiceNumber: 'INV-001',
      description: 'Standard Plan',
      billedToName: 'Karan Singh',
      billedToEmail: 'karan@example.com',
    });
    retrieveSession.mockResolvedValue({
      id: 'cs_live_123',
      metadata: { invoice_id: 'invoice-1' },
      payment_status: 'paid',
      amount_total: 100,
      currency: 'usd',
      created: 1787356800,
      payment_intent: { id: 'pi_123' },
      subscription: 'sub_123',
    });
    generatePaymentSlipPdfBuffer.mockResolvedValue(Buffer.from('payment-slip'));

    const response = await GET(
      new Request('http://localhost/api/invoices/invoice-1/payment-slip?session_id=cs_live_123'),
      { params: Promise.resolve({ id: 'invoice-1' }) }
    );

    expect(response.status).toBe(200);
    expect(generatePaymentSlipPdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'INV-001',
        paymentReference: 'cs_live_123',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      })
    );
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('payment-slip-INV-001.pdf');
  });
});
