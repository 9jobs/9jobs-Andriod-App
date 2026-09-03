import { describe, expect, test } from '@jest/globals';

import { mapDocuSignEnvelopeStatus } from '@/lib/docusign/status';

describe('DocuSign envelope status mapping', () => {
  test('maps completed envelope status to completed', () => {
    expect(mapDocuSignEnvelopeStatus('completed')).toBe('completed');
  });

  test('maps sent-style statuses to sent lifecycle values', () => {
    expect(mapDocuSignEnvelopeStatus('sent')).toBe('sent');
    expect(mapDocuSignEnvelopeStatus('delivered')).toBe('delivered');
    expect(mapDocuSignEnvelopeStatus('declined')).toBe('declined');
  });

  test('falls back to draft for unknown statuses', () => {
    expect(mapDocuSignEnvelopeStatus('mystery-status')).toBe('draft');
  });
});
