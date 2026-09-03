import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const handleStripeWebhook = jest.fn();

jest.doMock('@/lib/billing/service', () => ({
  handleStripeWebhook,
}));

describe('stripe webhook route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('passes raw payload and Stripe signature to webhook handler', async () => {
    handleStripeWebhook.mockResolvedValue({ duplicate: false, eventType: 'invoice.paid' });
    const { POST } = await import('@/app/api/stripe/webhook/route');

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1,v1=test',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id: 'evt_1' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(handleStripeWebhook).toHaveBeenCalledWith({
      body: JSON.stringify({ id: 'evt_1' }),
      signature: 't=1,v1=test',
    });
    expect(body.eventType).toBe('invoice.paid');
  });

  test('rejects webhook requests without a Stripe signature', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_1' }),
      })
    );

    expect(response.status).toBe(400);
  });
});
