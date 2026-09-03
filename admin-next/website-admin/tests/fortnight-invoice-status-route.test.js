import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const updateFortnightInvoicePaymentStatus = jest.fn();

async function loadRoute() {
  jest.resetModules();
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/fortnight-invoices/service', () => ({
    updateFortnightInvoicePaymentStatus,
  }));

  return import('@/app/api/fortnight-invoices/[id]/status/route');
}

describe('fortnight invoice status route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates fortnight invoice payment status for admins', async () => {
    const { PATCH } = await loadRoute();
    requireAdminApiSession.mockResolvedValue({ adminId: 'admin-1' });
    updateFortnightInvoicePaymentStatus.mockResolvedValue({ _id: 'invoice-1', paymentStatus: 'pending' });

    const response = await PATCH(
      new Request('http://localhost/api/fortnight-invoices/invoice-1/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'pending' }),
      }),
      { params: Promise.resolve({ id: 'invoice-1' }) }
    );

    expect(response.status).toBe(200);
    expect(updateFortnightInvoicePaymentStatus).toHaveBeenCalledWith('invoice-1', 'pending');
  });
});
