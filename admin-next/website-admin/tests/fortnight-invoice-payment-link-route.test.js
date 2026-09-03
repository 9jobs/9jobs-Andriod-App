import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const createFortnightInvoicePaymentLink = jest.fn();

async function loadPaymentLinkRoute() {
  jest.resetModules();
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/fortnight-invoices/service', () => ({
    createFortnightInvoicePaymentLink,
  }));

  return import('@/app/api/fortnight-invoices/[id]/payment-link/route');
}

describe('fortnight invoice payment-link route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('creates a secure stripe checkout link for a fortnight invoice', async () => {
    const { POST } = await loadPaymentLinkRoute();
    createFortnightInvoicePaymentLink.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_fortnight',
      whatsappShareUrl: 'https://wa.me/61400000000?text=fortnight',
      paymentMode: 'monthly_autopay',
      invoice: {
        _id: 'fortnight-invoice-1',
        paymentStatus: 'pending',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/fortnight-invoices/fortnight-invoice-1/payment-link', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'fortnight-invoice-1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createFortnightInvoicePaymentLink).toHaveBeenCalledWith('fortnight-invoice-1', 'http://localhost');
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_fortnight');
    expect(body.paymentMode).toBe('monthly_autopay');
  });
});
