import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockConnectDb = jest.fn();
const mockWeeklyFindOne = jest.fn();
const mockFortnightFindOne = jest.fn();
const mockIsRateLimited = jest.fn().mockResolvedValue(false);
const mockHashToken = jest.fn(() => 'same-hash');
const mockConstantTimeCompare = jest.fn((left, right) => left === right);

jest.doMock('@/utils/db', () => ({
  __esModule: true,
  default: mockConnectDb,
}));

jest.doMock('@/utils/rateLimiter', () => ({
  isRateLimited: mockIsRateLimited,
}));

jest.doMock('@/utils/cryptoUtils', () => ({
  hashToken: mockHashToken,
  hashOtp: jest.fn(),
  constantTimeCompare: mockConstantTimeCompare,
  generateOtp: jest.fn(),
  generateSecureToken: jest.fn(),
}));

jest.doMock('@/lib/storage/blob', () => ({
  uploadPrivatePdf: jest.fn(),
}));

jest.doMock('@/lib/agreements/email', () => ({
  sendOtpEmail: jest.fn(),
  sendProviderSigningInvite: jest.fn(),
}));

jest.doMock('@/lib/fortnight-agreements/email', () => ({
  sendOtpEmail: jest.fn(),
  sendProviderSigningInvite: jest.fn(),
}));

jest.doMock('@/lib/agreements/completion', () => ({
  executeFinalSealing: jest.fn(),
}));

jest.doMock('@/lib/fortnight-agreements/completion', () => ({
  executeFinalSealing: jest.fn(),
}));

jest.doMock('@/models/Agreement', () => {
  class MockAgreement {}
  MockAgreement.findOne = mockWeeklyFindOne;
  return MockAgreement;
});

jest.doMock('@/models/FortnightAgreement', () => {
  class MockFortnightAgreement {}
  MockFortnightAgreement.findOne = mockFortnightFindOne;
  return MockFortnightAgreement;
});

async function loadWeeklyRoute() {
  jest.resetModules();
  return import('@/app/api/agreements/[id]/sign/route');
}

async function loadFortnightRoute() {
  jest.resetModules();
  return import('@/app/api/fortnight-agreements/[id]/sign/route');
}

describe('agreement sign context routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDb.mockResolvedValue(undefined);
    mockIsRateLimited.mockResolvedValue(false);
  });

  test('weekly client link returns client signer with separate provider company and signer names', async () => {
    mockWeeklyFindOne.mockResolvedValue({
      _id: 'agreement-1',
      status: 'sent_to_client',
      clientName: 'Vijay Shukla',
      clientEmail: 'vijay@example.com',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerSignatureName: 'Aditya Singh',
      clientSigningTokenHash: 'same-hash',
      providerSigningTokenHash: 'provider-hash',
      clientTokenExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
      clientTokenUsedAt: null,
      clientOtpVerifiedAt: null,
    });

    const { GET } = await loadWeeklyRoute();
    const response = await GET(
      new Request('http://localhost/api/agreements/agreement-1/sign?token=client-token'),
      { params: Promise.resolve({ id: 'agreement-1' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.signerRole).toBe('Client');
    expect(body.signerName).toBe('Vijay Shukla');
    expect(body.clientName).toBe('Vijay Shukla');
    expect(body.providerName).toBe('9 Jobs Pty Ltd');
    expect(body.providerSignerName).toBe('Aditya Singh');
  });

  test('weekly provider link returns provider signer name separately from service provider company name', async () => {
    mockWeeklyFindOne.mockResolvedValue({
      _id: 'agreement-1',
      status: 'sent_to_provider',
      clientName: 'Vijay Shukla',
      clientEmail: 'vijay@example.com',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerSignatureName: 'Aditya Singh',
      clientSigningTokenHash: 'client-hash',
      providerSigningTokenHash: 'same-hash',
      providerTokenExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
      providerTokenUsedAt: null,
      providerOtpVerifiedAt: null,
    });

    const { GET } = await loadWeeklyRoute();
    const response = await GET(
      new Request('http://localhost/api/agreements/agreement-1/sign?token=provider-token'),
      { params: Promise.resolve({ id: 'agreement-1' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.signerRole).toBe('Provider');
    expect(body.signerName).toBe('Aditya Singh');
    expect(body.providerName).toBe('9 Jobs Pty Ltd');
    expect(body.providerSignerName).toBe('Aditya Singh');
    expect(body.signerEmail).toBe('provider@9jobs.co');
  });

  test('fortnight provider link returns provider signer name separately from service provider company name', async () => {
    mockFortnightFindOne.mockResolvedValue({
      _id: 'fortnight-1',
      status: 'sent_to_provider',
      clientName: 'Rahul Kumar',
      clientEmail: 'rahul@example.com',
      providerName: '9 Jobs Pty Ltd',
      providerEmail: 'provider@9jobs.co',
      providerSignatureName: 'Aditya Singh',
      clientSigningTokenHash: 'client-hash',
      providerSigningTokenHash: 'same-hash',
      providerTokenExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
      providerTokenUsedAt: null,
      providerOtpVerifiedAt: null,
    });

    const { GET } = await loadFortnightRoute();
    const response = await GET(
      new Request('http://localhost/api/fortnight-agreements/fortnight-1/sign?token=provider-token'),
      { params: Promise.resolve({ id: 'fortnight-1' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.signerRole).toBe('Provider');
    expect(body.signerName).toBe('Aditya Singh');
    expect(body.providerName).toBe('9 Jobs Pty Ltd');
    expect(body.providerSignerName).toBe('Aditya Singh');
    expect(body.clientName).toBe('Rahul Kumar');
  });
});
