import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const createOneTimePlanCheckout = jest.fn();
const createSuccessBasedOnboardingCheckout = jest.fn();
const createWeeklySubscriptionCheckout = jest.fn();
const createCustomerPortalSession = jest.fn();
const cancelClientSubscription = jest.fn();
const createSuccessFeeCheckout = jest.fn();
const generateBillingLinkForClient = jest.fn();
const getBillingClientSummaryById = jest.fn();

jest.doMock('@/lib/admin/auth/require-admin', () => ({
  requireAdminApiSession,
}));

jest.doMock('@/lib/billing/service', () => ({
  createOneTimePlanCheckout,
  createSuccessBasedOnboardingCheckout,
  createWeeklySubscriptionCheckout,
  createCustomerPortalSession,
  cancelClientSubscription,
  createSuccessFeeCheckout,
  generateBillingLinkForClient,
  getBillingClientSummaryById,
}));

describe('billing routes', () => {
  const withNextUrl = (request) => {
    Object.defineProperty(request, 'nextUrl', {
      value: new URL(request.url),
      configurable: true,
    });
    return request;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ email: 'admin@9jobs.co' });
  });

  test('one-time checkout route uses public one-time plan service', async () => {
    createOneTimePlanCheckout.mockResolvedValue({ url: 'https://checkout/one-time' });
    const { POST } = await import('@/app/api/billing/one-time-checkout/route');

    const response = await POST(
      withNextUrl(new Request('http://localhost/api/billing/one-time-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName: 'Trial', amount: 1 }),
      }))
    );

    expect(response.status).toBe(200);
    expect(createOneTimePlanCheckout).toHaveBeenCalledWith({
      planName: 'Trial',
      origin: 'http://localhost',
    });
  });

  test('one-time checkout route uses personalized success-based service when token is provided', async () => {
    createSuccessBasedOnboardingCheckout.mockResolvedValue({ url: 'https://checkout/success-based' });
    const { POST } = await import('@/app/api/billing/one-time-checkout/route');

    const response = await POST(
      withNextUrl(new Request('http://localhost/api/billing/one-time-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'private-token' }),
      }))
    );

    expect(response.status).toBe(200);
    expect(createSuccessBasedOnboardingCheckout).toHaveBeenCalledWith({
      token: 'private-token',
      origin: 'http://localhost',
    });
  });

  test('subscription checkout route uses weekly subscription service', async () => {
    createWeeklySubscriptionCheckout.mockResolvedValue({ url: 'https://checkout/subscription' });
    const { POST } = await import('@/app/api/billing/subscription-checkout/route');
    const request = withNextUrl(new Request('http://localhost/api/billing/subscription-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-agent': 'jest' },
      body: JSON.stringify({ token: 'weekly-token', amount: 1 }),
    }));

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(createWeeklySubscriptionCheckout).toHaveBeenCalledWith({
      token: 'weekly-token',
      request,
      origin: 'http://localhost',
    });
  });

  test('customer portal route requires admin auth and opens portal session', async () => {
    createCustomerPortalSession.mockResolvedValue({ url: 'https://billing-portal' });
    const { POST } = await import('@/app/api/billing/customer-portal/route');

    const response = await POST(
      withNextUrl(new Request('http://localhost/api/billing/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: 'client-1' }),
      }))
    );

    expect(response.status).toBe(200);
    expect(createCustomerPortalSession).toHaveBeenCalledWith({
      clientId: 'client-1',
      origin: 'http://localhost',
    });
  });

  test('cancel subscription route records admin actor', async () => {
    cancelClientSubscription.mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true });
    const { POST } = await import('@/app/api/billing/subscription/cancel/route');

    const response = await POST(
      withNextUrl(new Request('http://localhost/api/billing/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: 'client-1' }),
      }))
    );

    expect(response.status).toBe(200);
    expect(cancelClientSubscription).toHaveBeenCalledWith({
      clientId: 'client-1',
      actor: 'admin@9jobs.co',
    });
  });

  test('success-fee route creates checkout and invoice from admin action', async () => {
    createSuccessFeeCheckout.mockResolvedValue({
      invoiceId: 'invoice-1',
      checkoutUrl: 'https://checkout/success-fee',
      checkoutSessionId: 'cs_123',
    });
    const { POST } = await import('@/app/api/billing/success-fee/route');

    const response = await POST(
      withNextUrl(new Request('http://localhost/api/billing/success-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: 'client-1', amountCents: 250000 }),
      }))
    );

    expect(response.status).toBe(200);
    expect(createSuccessFeeCheckout).toHaveBeenCalledWith({
      clientId: 'client-1',
      amountCents: 250000,
      actor: 'admin@9jobs.co',
      origin: 'http://localhost',
    });
  });

  test('admin billing-link route generates private checkout link', async () => {
    generateBillingLinkForClient.mockResolvedValue({
      token: 'token-1',
      url: 'https://9jobs.co/billing/token-1',
      expiresAt: '2026-09-12T00:00:00.000Z',
    });
    const { POST } = await import('@/app/api/admin/client-info/[id]/billing-link/route');

    const response = await POST(
      withNextUrl(new Request('http://localhost/api/admin/client-info/client-1/billing-link', {
        method: 'POST',
      })),
      { params: Promise.resolve({ id: 'client-1' }) }
    );

    expect(response.status).toBe(200);
    expect(generateBillingLinkForClient).toHaveBeenCalledWith('client-1', 'admin@9jobs.co', 'http://localhost');
  });

  test('billing client detail route returns billing summary for admin UI', async () => {
    getBillingClientSummaryById.mockResolvedValue({
      _id: 'client-1',
      fullName: 'Client One',
      email: 'client@example.com',
      billing: { billingState: 'ACTIVE_SUBSCRIPTION' },
    });
    const { GET } = await import('@/app/api/billing/client/[id]/route');

    const response = await GET(
      withNextUrl(new Request('http://localhost/api/billing/client/client-1')),
      { params: Promise.resolve({ id: 'client-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.billing.billingState).toBe('ACTIVE_SUBSCRIPTION');
  });
});
