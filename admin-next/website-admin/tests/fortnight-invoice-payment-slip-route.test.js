import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getFortnightInvoiceDocumentById = jest.fn();
const retrieveSession = jest.fn();
const generatePaymentSlipPdfBuffer = jest.fn();

async function loadRoute() {
  jest.resetModules();
  jest.doMock('@/lib/fortnight-invoices/service', () => ({
    getFortnightInvoiceDocumentById,
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

  return import('@/app/api/fortnight-invoices/[id]/payment-slip/route');
}

describe('fortnight invoice payment-slip route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('downloads a paid fortnight invoice payment slip pdf', async () => {
    const { GET } = await loadRoute();
    getFortnightInvoiceDocumentById.mockResolvedValue({
      _id: 'fortnight-1',
      invoiceNumber: 'FINV-001',
      description: 'Fortnight Plan',
      billedToName: 'Karan Singh',
      billedToEmail: 'karan@example.com',
    });
    retrieveSession.mockResolvedValue({
      id: 'cs_live_456',
      metadata: { fortnight_invoice_id: 'fortnight-1' },
      payment_status: 'paid',
      amount_total: 200,
      currency: 'usd',
      created: 1787356800,
      payment_intent: { id: 'pi_456' },
      subscription: 'sub_456',
    });
    generatePaymentSlipPdfBuffer.mockResolvedValue(Buffer.from('payment-slip'));

    const response = await GET(
      new Request('http://localhost/api/fortnight-invoices/fortnight-1/payment-slip?session_id=cs_live_456'),
      { params: Promise.resolve({ id: 'fortnight-1' }) }
    );

    expect(response.status).toBe(200);
    expect(generatePaymentSlipPdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'FINV-001',
        paymentReference: 'cs_live_456',
        paymentIntentId: 'pi_456',
        subscriptionId: 'sub_456',
      })
    );
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('payment-slip-FINV-001.pdf');
  });
});
