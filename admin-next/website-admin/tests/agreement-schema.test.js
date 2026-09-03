import { describe, expect, test } from '@jest/globals';

import { agreementInputSchema } from '@/lib/agreements/schema';

describe('agreement input schema', () => {
  test('accepts a valid agreement payload', () => {
    const result = agreementInputSchema.parse({
      clientName: 'Jane Client',
      clientEmail: 'jane@example.com',
      clientPhone: '+61 400 000 000',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerPhone: '+61 422 279 428',
      providerSignatureName: 'Rahul Sharma',
      agreementDate: '2026-06-27',
      packageName: 'Premium Job Search',
      servicePrice: '999',
      weeklyJobTarget: '65',
      initialTerm: '4 weeks',
      notes: 'Custom onboarding notes.',
    });

    expect(result.clientName).toBe('Jane Client');
    expect(result.weeklyJobTarget).toBe('65');
  });

  test('rejects invalid client email', () => {
    expect(() =>
      agreementInputSchema.parse({
        clientName: 'Jane Client',
        clientEmail: 'invalid-email',
        clientPhone: '+61 400 000 000',
        providerName: '9 Jobs Pty Ltd',
        providerEmail: 'provider@9jobs.co',
        providerPhone: '+61 422 279 428',
        providerSignatureName: 'Rahul Sharma',
        agreementDate: '2026-06-27',
        packageName: 'Premium Job Search',
        servicePrice: '999',
        weeklyJobTarget: '65',
        initialTerm: '4 weeks',
      })
    ).toThrow();
  });
});
