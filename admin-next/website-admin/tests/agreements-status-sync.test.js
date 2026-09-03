import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const downloadCompletedEnvelopePdf = jest.fn();
const getDocuSignEnvelopeStatus = jest.fn();
const hasDocuSignRuntimeConfig = jest.fn();

async function loadAgreementService() {
  jest.resetModules();
  const mockUploadPrivatePdf = jest.fn().mockResolvedValue({
    url: 'gridfs://agreements/agreement-1/signed-agreement.pdf',
    path: 'agreements/agreement-1/signed-agreement.pdf',
  });
  jest.doMock('@/utils/db', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue({}),
  }));
  jest.doMock('@/models/Agreement', () => ({
    __esModule: true,
    default: {},
  }));
  jest.doMock('@/lib/storage/blob', () => ({
    uploadPrivatePdf: mockUploadPrivatePdf,
    fetchBlobBuffer: jest.fn(),
    fetchBlobBufferByKey: jest.fn(),
  }));
  jest.doMock('@/lib/agreements/pdf', () => ({
    generateAgreementPdfBuffer: jest.fn(),
  }));
  jest.doMock('@/lib/docusign/client', () => ({
    downloadCompletedEnvelopePdf,
    getDocuSignEnvelopeStatus,
    hasDocuSignRuntimeConfig,
  }));

  return import('@/lib/agreements/service');
}

describe('agreement DocuSign status sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasDocuSignRuntimeConfig.mockReturnValue(true);
    downloadCompletedEnvelopePdf.mockResolvedValue(Buffer.from('%PDF-signed'));
  });

  test('marks the agreement as completed and stores the signed pdf when DocuSign is finished', async () => {
    const { syncAgreementDocumentStatusFromDocuSign } = await loadAgreementService();
    getDocuSignEnvelopeStatus.mockResolvedValue({
      status: 'completed',
      envelopeId: 'env-123',
    });

    const agreementDocument = {
      _id: 'agreement-1',
      clientName: 'Jane Client',
      clientEmail: 'jane@example.com',
      clientPhone: '+61 400 111 222',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'admin@9jobs.co',
      providerPhone: '+61 422 279 428',
      providerSignatureName: 'Admin Signatory',
      agreementDate: '2026-06-30',
      packageName: 'Premium Job Search',
      servicePrice: '999',
      weeklyJobTarget: '65',
      initialTerm: '4 weeks',
      notes: '',
      docuSignEnvelopeId: 'env-123',
      status: 'sent',
      envelopeEvents: [],
      signedPdfUrl: '',
      save: jest.fn().mockResolvedValue(undefined),
      toObject() {
        return { ...this };
      },
    };

    const result = await syncAgreementDocumentStatusFromDocuSign(agreementDocument);

    expect(getDocuSignEnvelopeStatus).toHaveBeenCalledWith('env-123', {});
    expect(downloadCompletedEnvelopePdf).toHaveBeenCalledWith('env-123');
    expect(agreementDocument.status).toBe('completed');
    expect(agreementDocument.signedPdfUrl).toBe('gridfs://agreements/agreement-1/signed-agreement.pdf');
    expect(result.status).toBe('completed');
  });
});
