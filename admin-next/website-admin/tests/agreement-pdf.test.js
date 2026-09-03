import { describe, expect, test } from '@jest/globals';

import { generateAgreementPdfBuffer } from '@/lib/agreements/pdf';

describe('agreement pdf', () => {
  test('generates a PDF buffer for preview and DocuSign delivery', async () => {
    const buffer = await generateAgreementPdfBuffer({
      clientName: 'Jane Client',
      clientEmail: 'jane@example.com',
      clientPhone: '+61 400 111 222',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerPhone: '+61 422 279 428',
      providerSignatureName: 'Aditya Singh',
      agreementDate: '2026-06-30',
      packageName: 'Premium Job Search',
      servicePrice: '$999 (AUD)',
      weeklyJobTarget: '65',
      initialTerm: '4 weeks',
      notes: 'Priority applications for Melbourne operations roles.',
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
