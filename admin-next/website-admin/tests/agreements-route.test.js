import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const createAgreement = jest.fn();
const deleteAllAgreements = jest.fn();
const getAgreementDocumentById = jest.fn();
const generateAndStoreAgreementPdf = jest.fn();
const listAgreements = jest.fn();

async function loadAgreementsRoute() {
  jest.resetModules();
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/agreements/service', () => ({
    createAgreement,
    deleteAllAgreements,
    getAgreementDocumentById,
    generateAndStoreAgreementPdf,
    listAgreements,
  }));

  return import('@/app/api/agreements/route');
}

function buildAgreementPayload() {
  return {
    clientName: 'Jane Client',
    clientEmail: 'jane@example.com',
    clientPhone: '+61 400 000 000',
    providerName: '9 Jobs Pty Ltd',
    providerEmail: 'provider@9jobs.co',
    providerPhone: '+61 422 279 428',
    providerSignatureName: 'Rahul Sharma',
    agreementDate: '2026-06-30',
    packageName: 'Premium Job Search',
    servicePrice: '999',
    weeklyJobTarget: '65',
    initialTerm: '4 weeks',
    notes: 'Priority applications for Melbourne operations roles.',
  };
}

describe('agreements route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('creates an agreement and auto-generates its preview pdf', async () => {
    const { POST } = await loadAgreementsRoute();
    createAgreement.mockResolvedValue({
      _id: 'agreement-1',
      clientName: 'Jane Client',
    });
    getAgreementDocumentById.mockResolvedValue({
      _id: 'agreement-1',
    });
    generateAndStoreAgreementPdf.mockResolvedValue({
      agreement: {
        _id: 'agreement-1',
        clientName: 'Jane Client',
        generatedPdfUrl: 'db://agreements/agreement-1/generated-agreement.pdf',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/agreements', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildAgreementPayload()),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createAgreement).toHaveBeenCalled();
    expect(getAgreementDocumentById).toHaveBeenCalledWith('agreement-1');
    expect(generateAndStoreAgreementPdf).toHaveBeenCalledWith({
      _id: 'agreement-1',
    });
    expect(body.previewUrl).toBe('/api/agreements/agreement-1/preview-pdf');
    expect(body.agreement.generatedPdfUrl).toBeTruthy();
  });

  test('clears old agreements for a fresh admin workspace', async () => {
    const { DELETE } = await loadAgreementsRoute();
    deleteAllAgreements.mockResolvedValue(2);

    const response = await DELETE(
      new Request('http://localhost/api/agreements', {
        method: 'DELETE',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deleteAllAgreements).toHaveBeenCalled();
    expect(body.deletedCount).toBe(2);
  });
});
