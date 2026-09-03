import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const updateInvoicePaymentStatus = jest.fn();

async function loadRoute() {
  jest.resetModules();
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/invoices/service', () => ({
    updateInvoicePaymentStatus,
  }));

  return import('@/app/api/invoices/[id]/status/route');
}

describe('invoice status route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates invoice payment status for admins', async () => {
    const { PATCH } = await loadRoute();
    requireAdminApiSession.mockResolvedValue({ adminId: 'admin-1' });
    updateInvoicePaymentStatus.mockResolvedValue({ _id: 'invoice-1', paymentStatus: 'paid' });

    const response = await PATCH(
      new Request('http://localhost/api/invoices/invoice-1/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'paid' }),
      }),
      { params: Promise.resolve({ id: 'invoice-1' }) }
    );

    expect(response.status).toBe(200);
    expect(updateInvoicePaymentStatus).toHaveBeenCalledWith('invoice-1', 'paid');
  });
});
