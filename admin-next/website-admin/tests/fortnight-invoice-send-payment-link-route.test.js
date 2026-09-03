import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const createFortnightInvoicePaymentLink = jest.fn();
const getFortnightInvoiceDocumentById = jest.fn();
const sendMail = jest.fn();
const createTransport = jest.fn(() => ({
  sendMail,
}));

async function loadSendPaymentLinkRoute() {
  jest.resetModules();
  jest.doMock('nodemailer', () => ({
    __esModule: true,
    default: {
      createTransport,
    },
  }));
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/fortnight-invoices/service', () => ({
    createFortnightInvoicePaymentLink,
    getFortnightInvoiceDocumentById,
  }));

  return import('@/app/api/fortnight-invoices/[id]/send-payment-link/route');
}

describe('fortnight invoice send payment-link route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_PASS = 'test-password';
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('emails only the payment link without pdf attachment', async () => {
    const { POST } = await loadSendPaymentLinkRoute();
    getFortnightInvoiceDocumentById.mockResolvedValue({
      _id: 'fortnight-invoice-1',
      billedToName: 'Neetu Sharma',
      billedToEmail: 'sharmamelbourne91@gmail.com',
      description: 'Upfront Fees',
      total: '150',
    });
    createFortnightInvoicePaymentLink.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_fortnight_123',
      whatsappShareUrl: 'https://wa.me/61421803703?text=fortnight',
      paymentMode: 'upfront',
    });

    const response = await POST(
      new Request('http://localhost/api/fortnight-invoices/fortnight-invoice-1/send-payment-link', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'fortnight-invoice-1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createFortnightInvoicePaymentLink).toHaveBeenCalledWith('fortnight-invoice-1', 'http://localhost');
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sharmamelbourne91@gmail.com',
        subject: '9Jobs Payment Details',
        html: expect.stringContaining('Payment Now'),
        html: expect.stringContaining('href="https://checkout.stripe.com/pay/cs_test_fortnight_123"'),
      })
    );
    expect(sendMail.mock.calls[0][0].attachments).toBeUndefined();
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_fortnight_123');
    expect(body.whatsappShareUrl).toBe('https://wa.me/61421803703?text=fortnight');
  });
});
