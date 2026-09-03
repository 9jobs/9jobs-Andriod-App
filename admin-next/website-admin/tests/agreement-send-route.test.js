import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockRequireAdminApiSession = jest.fn();
const mockCreateDocuSignEnvelope = jest.fn();
const mockResolveEsignProvider = jest.fn();
const mockGetAgreementById = jest.fn();
const mockGetAgreementDocumentById = jest.fn();
const mockGenerateAndStoreAgreementPdf = jest.fn();
const mockGetAgreementPdfBuffer = jest.fn();
const mockHashPdf = jest.fn();
const mockGenerateSecureToken = jest.fn();
const mockHashToken = jest.fn();
const mockSendClientSigningInvite = jest.fn();
const mockSave = jest.fn();

jest.doMock('@/lib/admin/auth/require-admin', () => ({
  requireAdminApiSession: mockRequireAdminApiSession,
}));

jest.doMock('@/lib/docusign/client', () => ({
  createDocuSignEnvelope: mockCreateDocuSignEnvelope,
}));

jest.doMock('@/lib/agreements/provider', () => ({
  resolveEsignProvider: mockResolveEsignProvider,
}));

jest.doMock('@/lib/agreements/service', () => ({
  getAgreementById: mockGetAgreementById,
  getAgreementDocumentById: mockGetAgreementDocumentById,
  generateAndStoreAgreementPdf: mockGenerateAndStoreAgreementPdf,
  getAgreementPdfBuffer: mockGetAgreementPdfBuffer,
}));

jest.doMock('@/utils/cryptoUtils', () => ({
  hashPdf: mockHashPdf,
  generateSecureToken: mockGenerateSecureToken,
  hashToken: mockHashToken,
}));

jest.doMock('@/lib/agreements/email', () => ({
  sendClientSigningInvite: mockSendClientSigningInvite,
}));

async function loadRoute() {
  jest.resetModules();
  return import('@/app/api/docusign/send/[agreementId]/route');
}

function makeAgreement(overrides = {}) {
  return {
    _id: 'agreement-1',
    generatedPdfUrl: 'https://storage/generated.pdf',
    generatedPdfPath: 'agreements/agree-1/generated.pdf',
    originalPdfSha256: '',
    originalPdfUrl: '',
    originalPdfStorageKey: '',
    esignProvider: '',
    esignError: 'old error',
    clientEmail: 'client@example.com',
    providerEmail: 'provider@example.com',
    clientSigningTokenHash: 'old-client-hash',
    clientTokenExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
    clientTokenUsedAt: new Date('2026-08-01T00:10:00.000Z'),
    clientOtpHash: 'old-client-otp',
    clientOtpExpiresAt: new Date('2026-08-01T00:11:00.000Z'),
    clientOtpAttempts: 2,
    clientOtpCooldownUntil: new Date('2026-08-01T00:12:00.000Z'),
    clientOtpVerifiedAt: new Date('2026-08-01T00:13:00.000Z'),
    clientDocumentViewedAt: new Date('2026-08-01T00:14:00.000Z'),
    clientInvitationSentAt: new Date('2026-08-01T00:15:00.000Z'),
    clientCompletionEmailSentAt: new Date('2026-08-01T00:16:00.000Z'),
    clientConsentAcceptedAt: new Date('2026-08-01T00:17:00.000Z'),
    clientSignature: {
      name: 'Old Client',
      ip: '1.1.1.1',
      userAgent: 'UA',
      signedAt: new Date('2026-08-01T00:18:00.000Z'),
      signatureFileKey: 'client.png',
      signatureType: 'typed',
    },
    providerSigningTokenHash: 'old-provider-hash',
    providerTokenExpiresAt: new Date('2026-08-01T00:19:00.000Z'),
    providerTokenUsedAt: new Date('2026-08-01T00:20:00.000Z'),
    providerOtpHash: 'old-provider-otp',
    providerOtpExpiresAt: new Date('2026-08-01T00:21:00.000Z'),
    providerOtpAttempts: 1,
    providerOtpCooldownUntil: new Date('2026-08-01T00:22:00.000Z'),
    providerOtpVerifiedAt: new Date('2026-08-01T00:23:00.000Z'),
    providerDocumentViewedAt: new Date('2026-08-01T00:24:00.000Z'),
    providerInvitationSentAt: new Date('2026-08-01T00:25:00.000Z'),
    providerCompletionEmailSentAt: new Date('2026-08-01T00:26:00.000Z'),
    providerConsentAcceptedAt: new Date('2026-08-01T00:27:00.000Z'),
    providerSignature: {
      name: 'Old Provider',
      ip: '2.2.2.2',
      userAgent: 'UA2',
      signedAt: new Date('2026-08-01T00:28:00.000Z'),
      signatureFileKey: 'provider.png',
      signatureType: 'drawn',
    },
    clientDownloadTokenHash: 'old-client-download',
    providerDownloadTokenHash: 'old-provider-download',
    downloadTokenExpiresAt: new Date('2026-08-01T00:29:00.000Z'),
    signedPdfUrl: 'https://storage/signed.pdf',
    signedPdfPath: 'agreements/agree-1/signed.pdf',
    signedPdfStorageKey: 'signed-key',
    signedPdfSha256: 'signed-sha',
    auditTrailUrl: 'https://storage/audit.json',
    auditTrailStorageKey: 'audit-key',
    auditTrailSha256: 'audit-sha',
    signedAt: new Date('2026-08-01T00:30:00.000Z'),
    completionLockId: 'lock-1',
    completionStartedAt: new Date('2026-08-01T00:31:00.000Z'),
    completionAttemptCount: 3,
    status: 'draft',
    sentAt: null,
    envelopeEvents: [],
    save: mockSave,
    ...overrides,
  };
}

describe('agreement send route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApiSession.mockResolvedValue({ adminId: 'admin-1' });
    mockGenerateAndStoreAgreementPdf.mockResolvedValue(undefined);
    mockGetAgreementById.mockResolvedValue({ _id: 'agreement-1' });
    mockGetAgreementPdfBuffer.mockResolvedValue(Buffer.from('%PDF-1.4'));
    mockResolveEsignProvider.mockReturnValue('internal');
    mockHashPdf.mockReturnValue('fresh-pdf-sha');
    mockGenerateSecureToken.mockReturnValue('raw-client-token');
    mockHashToken.mockReturnValue('hashed-client-token');
    mockSendClientSigningInvite.mockResolvedValue(true);
    mockSave.mockResolvedValue(true);
  });

  test('restarts the internal signing workflow in a clean client-first state', async () => {
    const agreementDocument = makeAgreement();
    mockGetAgreementDocumentById.mockResolvedValue(agreementDocument);

    const { POST } = await loadRoute();
    const response = await POST(new Request('http://localhost/api/docusign/send/agreement-1', { method: 'POST' }), {
      params: Promise.resolve({ agreementId: 'agreement-1' }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(agreementDocument.status).toBe('sent_to_client');
    expect(agreementDocument.clientSigningTokenHash).toBe('hashed-client-token');
    expect(agreementDocument.clientOtpHash).toBe('');
    expect(agreementDocument.clientOtpVerifiedAt).toBeNull();
    expect(agreementDocument.clientSignature.signedAt).toBeNull();
    expect(agreementDocument.providerSigningTokenHash).toBe('');
    expect(agreementDocument.providerOtpHash).toBe('');
    expect(agreementDocument.providerOtpVerifiedAt).toBeNull();
    expect(agreementDocument.providerInvitationSentAt).toBeNull();
    expect(agreementDocument.providerSignature.signedAt).toBeNull();
    expect(agreementDocument.signedPdfStorageKey).toBe('');
    expect(agreementDocument.auditTrailStorageKey).toBe('');
    expect(agreementDocument.completionLockId).toBe('');
    expect(mockSendClientSigningInvite).toHaveBeenCalledWith(agreementDocument, 'raw-client-token');
  });

  test('blocks sending when client and provider email are the same', async () => {
    mockGetAgreementDocumentById.mockResolvedValue(
      makeAgreement({
        clientEmail: 'same@example.com',
        providerEmail: ' same@example.com ',
      })
    );

    const { POST } = await loadRoute();
    const response = await POST(new Request('http://localhost/api/docusign/send/agreement-1', { method: 'POST' }), {
      params: Promise.resolve({ agreementId: 'agreement-1' }),
    });

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('must be different');
    expect(mockSendClientSigningInvite).not.toHaveBeenCalled();
  });
});
