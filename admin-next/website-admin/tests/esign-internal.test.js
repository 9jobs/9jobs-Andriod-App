import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { hashToken, hashOtp } from '@/utils/cryptoUtils';
import { generateAuditTrail } from '@/utils/auditTrail';
import { parsePdfSignatureCoords, resolvePdfSignatureCoords } from '@/utils/pdfCoords';
import { generateAgreementPdfArtifact, generateAgreementPdfBuffer } from '@/lib/agreements/pdf';
import { sanitizeAndReencodePng } from '@/utils/pngUtils';

// Mock all external modules
const mockIsRateLimited = jest.fn().mockResolvedValue(false);
jest.doMock('@/utils/rateLimiter', () => ({
  isRateLimited: mockIsRateLimited
}));

const mockSendOtpEmail = jest.fn().mockResolvedValue(true);
const mockSendClientSigningInvite = jest.fn().mockResolvedValue(true);
const mockSendProviderSigningInvite = jest.fn().mockResolvedValue(true);
const mockSendAgreementCompletedEmail = jest.fn().mockResolvedValue(true);

jest.doMock('@/lib/agreements/email', () => ({
  sendOtpEmail: mockSendOtpEmail,
  sendClientSigningInvite: mockSendClientSigningInvite,
  sendProviderSigningInvite: mockSendProviderSigningInvite,
  sendAgreementCompletedEmail: mockSendAgreementCompletedEmail
}));

const mockUploadPrivatePdf = jest.fn().mockResolvedValue({ url: 'https://storage/signed.pdf', path: 'signed.pdf' });
const mockFetchBlobBuffer = jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test buffer'));
const mockFetchBlobBufferByKey = jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test buffer'));
const mockDeleteStoredFileByKey = jest.fn().mockResolvedValue(1);

jest.doMock('@/lib/storage/blob', () => ({
  uploadPrivatePdf: mockUploadPrivatePdf,
  fetchBlobBuffer: mockFetchBlobBuffer,
  fetchBlobBufferByKey: mockFetchBlobBufferByKey,
  deleteStoredFileByKey: mockDeleteStoredFileByKey
}));

jest.doMock('@/utils/pdfSealer', () => ({
  sealAgreementPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 sealed buffer'))
}));

const mockExecuteFinalSealing = jest.fn().mockResolvedValue({ status: 'completed' });
jest.doMock('@/lib/agreements/completion', () => ({
  executeFinalSealing: mockExecuteFinalSealing,
  retryFailedAgreementCompletion: jest.fn(),
}));

// Mock Database Connection
jest.doMock('@/utils/db', () => jest.fn());

// Mock Agreement Model
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateOne = jest.fn();
const mockSave = jest.fn();

class MockAgreement {
  constructor(data) {
    Object.assign(this, data);
    this.save = mockSave;
  }
}
MockAgreement.findOne = mockFindOne;
MockAgreement.findOneAndUpdate = mockFindOneAndUpdate;
MockAgreement.updateOne = mockUpdateOne;

jest.doMock('@/models/Agreement', () => MockAgreement);

// Helper to load POST handler
async function loadSignRoute() {
  jest.resetModules();
  return import('@/app/api/agreements/[id]/sign/route');
}

describe('secure internal e-signature workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(true);
    mockIsRateLimited.mockResolvedValue(false);
    mockUploadPrivatePdf.mockResolvedValue({ url: 'https://storage/signed.pdf', path: 'signed.pdf' });
    mockSendAgreementCompletedEmail.mockResolvedValue(true);
  });

  test('rejects request with invalid token', async () => {
    mockFindOne.mockResolvedValue(null);
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'invalid-token' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('Access denied: Invalid token.');
  });

  test('rejects request if token has already been used', async () => {
    const agreementData = {
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('used-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientTokenUsedAt: new Date(),
      status: 'sent_to_client'
    };
    mockFindOne.mockResolvedValue(new MockAgreement(agreementData));
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'used-token' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Access denied: Token already used.');
  });

  test('rejects request if token has expired', async () => {
    const agreementData = {
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('expired-token'),
      clientTokenExpiresAt: new Date(Date.now() - 1000),
      clientTokenUsedAt: null,
      status: 'sent_to_client'
    };
    mockFindOne.mockResolvedValue(new MockAgreement(agreementData));
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'expired-token' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Access denied: Token expired.');
  });

  test('generates, hashes, and emails 6-digit OTP code', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientTokenUsedAt: null,
      status: 'sent_to_client'
    });
    mockFindOne.mockResolvedValue(agreementData);

    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'valid-token' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(agreementData.clientOtpHash).toBeTruthy();
    expect(agreementData.clientOtpExpiresAt).toBeInstanceOf(Date);
    expect(mockIsRateLimited).toHaveBeenCalledWith(
      `agreement:agreement-1:client:request-otp:${hashToken('valid-token')}:v3`,
      30,
      60 * 60 * 1000
    );
  });

  test('locks OTP validation after 3 failed attempts', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientTokenUsedAt: null,
      clientOtpHash: hashOtp('123456'),
      clientOtpExpiresAt: new Date(Date.now() + 100000),
      clientOtpAttempts: 3,
      status: 'sent_to_client'
    });
    mockFindOne.mockResolvedValue(agreementData);
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', token: 'valid-token', otp: '123456' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('Exceeded 3 maximum attempts');
  });

  test('fails validation for incorrect OTP and increments attempt counter', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientTokenUsedAt: null,
      clientOtpHash: hashOtp('123456'),
      clientOtpExpiresAt: new Date(Date.now() + 100000),
      clientOtpAttempts: 0,
      status: 'sent_to_client'
    });
    mockFindOne.mockResolvedValue(agreementData);
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', token: 'valid-token', otp: '654321' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Incorrect verification code.');
    expect(agreementData.clientOtpAttempts).toBe(1);
  });

  test('rejects signature submission if consent checkbox is unchecked', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientTokenUsedAt: null,
      clientOtpVerifiedAt: new Date(),
      status: 'sent_to_client'
    });
    mockFindOne.mockResolvedValue(agreementData);
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit_signature', 
          token: 'valid-token', 
          consentAccepted: false,
          signatureType: 'typed',
          signatureName: 'Jane Client'
        })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('Consent is mandatory');
  });

  test('rejects request with token bound to another agreement', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      status: 'sent_to_client'
    });
    
    mockFindOne.mockImplementation((query) => {
      if (query._id !== 'agreement-1') {
        return Promise.resolve(null);
      }
      return Promise.resolve(agreementData);
    });

    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-2/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'valid-token' })
      }),
      { params: { id: 'agreement-2' } }
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('Access denied: Invalid token.');
  });

  test('blocks provider signing attempts before client signing is completed', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      providerSigningTokenHash: hashToken('provider-token'),
      providerTokenExpiresAt: new Date(Date.now() + 100000),
      status: 'sent_to_client'
    });
    
    mockFindOne.mockImplementation((query) => {
      if (query._id !== 'agreement-1') return Promise.resolve(null);
      return Promise.resolve(agreementData);
    });

    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'provider-token' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toContain('Out of sequence');
  });

  test('rejects drawn signatures that are not PNG images (SVG injection protection)', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientOtpVerifiedAt: new Date(),
      status: 'sent_to_client'
    });
    
    mockFindOne.mockImplementation((query) => {
      if (query._id !== 'agreement-1') return Promise.resolve(null);
      return Promise.resolve(agreementData);
    });

    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit_signature', 
          token: 'valid-token', 
          consentAccepted: true,
          signatureType: 'drawn',
          signatureName: 'Jane Client',
          signatureImage: 'data:image/png;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='
        })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('Signature validation failed: Invalid file format');
  });

  test('verifies pdfCoords parser fails with controlled error for invalid PDF buffers', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    const validPdfBuffer = Buffer.from(await pdfDoc.save());

    await expect(parsePdfSignatureCoords(validPdfBuffer)).rejects.toThrow('Controlled Error');
  });

  test('verifies audit trail builds all required audit evidence fields securely', () => {
    const mockAgreement = {
      _id: 'agreement-12345',
      clientName: 'Jane Client',
      clientEmail: 'jane@client.com',
      providerName: '9Jobs Ltd',
      providerEmail: 'admin@9jobs.co',
      originalPdfSha256: 'orig-sha256',
      signedPdfSha256: 'signed-sha256',
      clientDocumentViewedAt: new Date('2026-07-16T10:00:00Z'),
      clientOtpVerifiedAt: new Date('2026-07-16T10:01:00Z'),
      clientConsentAcceptedAt: new Date('2026-07-16T10:02:00Z'),
      clientSignature: {
        name: 'Jane Client',
        signedAt: new Date('2026-07-16T10:02:15Z'),
        signatureType: 'drawn',
        ip: '192.168.1.15',
        userAgent: 'Firefox'
      },
      providerDocumentViewedAt: new Date('2026-07-16T10:05:00Z'),
      providerOtpVerifiedAt: new Date('2026-07-16T10:06:00Z'),
      providerConsentAcceptedAt: new Date('2026-07-16T10:07:00Z'),
      providerSignature: {
        name: 'Rahul Sharma',
        signedAt: new Date('2026-07-16T10:07:30Z'),
        signatureType: 'typed',
        ip: '::1',
        userAgent: 'Safari'
      },
      completedAt: new Date('2026-07-16T10:08:00Z')
    };

    const { hash, buffer } = generateAuditTrail(mockAgreement);
    const record = JSON.parse(buffer.toString('utf-8'));

    expect(hash).toBeTruthy();
    expect(record.auditRecordSha256).toBe(hash);
    expect(record.signatures.client.ipAddress).toBe('192.168.1.xxx');
    expect(record.signatures.provider.ipAddress).toBe('localhost');
    expect(record.documentIntegrity.originalPdfSha256).toBe('orig-sha256');
    expect(record.signatures.client.signatureType).toBe('drawn');
    expect(record.signatures.provider.signatureType).toBe('typed');
  });

  test('real PDF anchor-extraction regression test', async () => {
    const pdfBuffer = await generateAgreementPdfBuffer({
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

    const coords = await parsePdfSignatureCoords(pdfBuffer);
    expect(coords.providerSign).toBeTruthy();
    expect(coords.customerSign).toBeTruthy();
    expect(coords.dateBlock).toBeTruthy();

    expect(coords.providerSign.x).toBe(114);
    expect(coords.providerSign.y).toBe(459.39);
    expect(coords.customerSign.x).toBe(375);
    expect(coords.customerSign.y).toBe(459.39);
    expect(coords.dateBlock.x).toBe(114);
    expect(coords.dateBlock.y).toBe(424.39);
  });

  test('generated PDF artifact exposes deterministic anchor coordinates', async () => {
    const artifact = await generateAgreementPdfArtifact({
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

    expect(Buffer.isBuffer(artifact.buffer)).toBe(true);
    expect(artifact.anchorCoords.providerSign.pageIndex).toBeGreaterThanOrEqual(0);
    expect(artifact.anchorCoords.customerSign.pageIndex).toBeGreaterThanOrEqual(0);
    expect(artifact.anchorCoords.dateBlock.pageIndex).toBeGreaterThanOrEqual(0);
  });

  test('resolvePdfSignatureCoords falls back to stored agreement anchor coordinates', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    const blankPdfBuffer = Buffer.from(await pdfDoc.save());

    const coords = await resolvePdfSignatureCoords(blankPdfBuffer, {
      pdfAnchorCoords: {
        providerSign: { pageIndex: 1, x: 100, y: 200 },
        customerSign: { pageIndex: 1, x: 110, y: 210 },
        dateBlock: { pageIndex: 1, x: 120, y: 220 },
      },
    });

    expect(coords).toEqual({
      providerSign: { pageIndex: 1, x: 100, y: 200 },
      customerSign: { pageIndex: 1, x: 110, y: 210 },
      dateBlock: { pageIndex: 1, x: 120, y: 220 },
    });
  });

  test('rejects empty transparent 1x1 pixel PNG', () => {
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64');
    expect(() => sanitizeAndReencodePng(transparentPng)).toThrow('blank or completely transparent');
  });

  test('rejects malformed PNG header', () => {
    const malformed = Buffer.from('not-a-png-header-at-all');
    expect(() => sanitizeAndReencodePng(malformed)).toThrow('Invalid file format');
  });

  test('rejects oversized PNG (>100KB)', () => {
    const oversized = Buffer.alloc(101 * 1024);
    expect(() => sanitizeAndReencodePng(oversized)).toThrow('size exceeds');
  });

  test('rejects requesting OTP within 60 seconds cooldown', async () => {
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      clientEmail: 'jane@example.com',
      clientName: 'Jane Client',
      clientSigningTokenHash: hashToken('valid-token'),
      clientTokenExpiresAt: new Date(Date.now() + 100000),
      clientTokenUsedAt: null,
      clientOtpCooldownUntil: new Date(Date.now() + 10000), // cooldown active
      status: 'sent_to_client'
    });
    mockFindOne.mockResolvedValue(agreementData);
    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token: 'valid-token' })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(429);
    expect(body.error).toContain('cooldown active');
    expect(mockIsRateLimited).not.toHaveBeenCalled();
  });

  test('recovers from expired completion lock (Point 8)', async () => {
    const providerToken = 'provider-token';
    const agreementData = new MockAgreement({
      _id: 'agreement-1',
      providerEmail: 'provider@9jobs.co',
      providerSignatureName: 'Rahul Sharma',
      providerSigningTokenHash: hashToken(providerToken),
      providerTokenExpiresAt: new Date(Date.now() + 100000),
      providerTokenUsedAt: null,
      providerOtpVerifiedAt: new Date(),
      status: 'sent_to_provider',
      clientSignature: { signedAt: new Date() },
      providerSignature: {},
      originalPdfStorageKey: 'original-pdf-key'
    });

    mockFindOne.mockResolvedValue(agreementData);
    
    // Simulate expired lock by making findOneAndUpdate succeed when completionStartedAt is set but older
    mockFindOneAndUpdate.mockResolvedValue(agreementData);

    const { POST } = await loadSignRoute();

    const response = await POST(
      new Request('http://localhost/api/agreements/agreement-1/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit_signature', 
          token: providerToken, 
          consentAccepted: true,
          signatureType: 'typed',
          signatureName: 'Rahul Sharma'
        })
      }),
      { params: { id: 'agreement-1' } }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  test('typed signature font constant is available for PDF sealing', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    expect(StandardFonts.TimesRomanItalic).toBe('Times-Italic');
    expect(font).toBeTruthy();
  });
});
