import { describe, expect, test } from '@jest/globals';

import { buildAgreementTemplate } from '@/lib/agreements/template';

describe('agreement template', () => {
  test('injects dynamic agreement fields into the master template', () => {
    const document = buildAgreementTemplate({
      clientName: 'Jane Client',
      clientEmail: 'jane@example.com',
      clientPhone: '+61 400 111 222',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerPhone: '+61 422 279 428',
      providerSignatureName: 'Aditya Singh',
      agreementDate: '2026-06-27',
      packageName: 'Premium Job Search',
      servicePrice: '$999 (AUD)',
      weeklyJobTarget: '65',
      initialTerm: '4 weeks',
      notes: 'Priority applications for Melbourne operations roles.',
    });

    expect(document.title).toBe('9Jobs Standard Plan Contract');
    expect(document.sections.some((section) => section.heading === '1. Scope of Services')).toBe(true);
    expect(document.signatureBlocks.customer.name).toBe('Jane Client');
    
    // Verify dynamic injection in sections
    const scopeSection = document.sections.find((s) => s.heading === '1. Scope of Services');
    expect(scopeSection.paragraphs[0]).toContain('65');

    const paymentSection = document.sections.find((s) => s.heading === '2. Payment Terms');
    expect(paymentSection.paragraphs[0]).toContain('$999 (AUD)');
    expect(paymentSection.paragraphs[1]).toContain('4 weeks');

    expect(document.sections.some((section) => section.heading === 'Notes')).toBe(false);
  });

  test('omits notes block when notes are blank', () => {
    const document = buildAgreementTemplate({
      clientName: 'Jane Client',
      clientEmail: 'jane@example.com',
      clientPhone: '+61 400 111 222',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerPhone: '+61 422 279 428',
      providerSignatureName: 'Aditya Singh',
      agreementDate: '2026-06-27',
      packageName: 'Premium Job Search',
      servicePrice: '$999 (AUD)',
      weeklyJobTarget: '65',
      initialTerm: '4 weeks',
      notes: '',
    });

    expect(document.sections.some((section) => section.heading === 'Notes')).toBe(false);
  });
});
