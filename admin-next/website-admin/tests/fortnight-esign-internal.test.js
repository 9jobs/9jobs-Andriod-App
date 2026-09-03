import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { generateAgreementPdfArtifact } from '@/lib/fortnight-agreements/pdf';
import { buildFortnightAgreementTemplate } from '@/lib/fortnight-agreements/template';

// Mock DB
jest.doMock('@/utils/db', () => jest.fn());

const dummyInput = {
  clientName: 'Sereana Hanfiro',
  clientEmail: 'kulasereana@yahoo.com',
  clientPhone: '+61 458456178',
  providerName: '9 Jobs Pty Ltd',
  providerEmail: '9jobsapplicationservice@gmail.com',
  providerPhone: '+61 422 279 428',
  providerSignatureName: 'Aditya Singh',
  providerAbn: '83679842972',
  agreementDate: '2026-08-07',
  servicePrice: 'AUD $250', // Upfront Service Fee
  initialTerm: 'three (3) months', // Service Period
  notes: 'Fortnight contract custom notes',
};

describe('Fortnight Agreement layout and logic tests', () => {
  test('template builds sections correctly with dynamic inputs', () => {
    const template = buildFortnightAgreementTemplate(dummyInput);
    expect(template.title).toBe('9Jobs Service Agreement');
    
    // Check service period (Section 2)
    const section2 = template.sections.find(s => s.heading.startsWith('2.'));
    expect(section2.intro).toContain('three (3) months');

    // Check upfront fee (Section 3)
    const section3 = template.sections.find(s => s.heading.startsWith('3.'));
    expect(section3.paragraphs[0]).toContain('AUD $250');
  });

  test('renewal copy keeps service period and renewal month separate', () => {
    const template = buildFortnightAgreementTemplate({
      ...dummyInput,
      initialTerm: '2 month',
      renewalEnabled: true,
      renewalTerm: '1 month',
      renewalFee: 'AUD $90',
    });

    const section2 = template.sections.find((section) => section.heading.startsWith('2.'));
    const section3 = template.sections.find((section) => section.heading.startsWith('3.'));

    expect(section2.intro).toContain('2 month');
    expect(section3.paragraphs[0]).toContain('for 2 month');
    expect(section3.paragraphs[1]).toContain('after 1 month');
  });

  test('generated PDF artifact exposes deterministic anchor coordinates', async () => {
    const artifact = await generateAgreementPdfArtifact(dummyInput);
    expect(artifact.buffer).toBeInstanceOf(Buffer);
    
    const coords = artifact.anchorCoords;
    expect(coords.providerSign).toBeTruthy();
    expect(coords.customerSign).toBeTruthy();
    expect(coords.dateBlock).toBeTruthy();

    expect(coords.providerSign.x).toBe(114);
    expect(coords.customerSign.x).toBe(375);
    expect(coords.dateBlock.x).toBe(54);
  });
});
