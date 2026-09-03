import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const createInvoicePaymentLink = jest.fn();

async function loadPaymentLinkRoute() {
  jest.resetModules();
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/invoices/service', () => ({
    createInvoicePaymentLink,
  }));

  return import('@/app/api/invoices/[id]/payment-link/route');
}

describe('invoice payment-link route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('creates a secure stripe checkout link for an invoice', async () => {
    const { POST } = await loadPaymentLinkRoute();
    createInvoicePaymentLink.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_invoice',
      whatsappShareUrl: 'https://wa.me/61400000000?text=invoice',
      invoice: {
        _id: 'invoice-1',
        paymentStatus: 'pending',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/invoices/invoice-1/payment-link', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'invoice-1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createInvoicePaymentLink).toHaveBeenCalledWith('invoice-1', 'http://localhost');
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_invoice');
    expect(body.invoice.paymentStatus).toBe('pending');
  });
});
