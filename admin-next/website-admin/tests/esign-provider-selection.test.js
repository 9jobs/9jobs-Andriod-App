import {
  isProductionAgreementHost,
  normalizeEsignProvider,
  resolveEsignProvider,
} from '@/lib/agreements/provider';

describe('e-sign provider selection', () => {
  test('normalizes provider values safely', () => {
    expect(normalizeEsignProvider(' Internal ')).toBe('internal');
    expect(normalizeEsignProvider('DOCUSIGN')).toBe('docusign');
    expect(normalizeEsignProvider(undefined)).toBe('');
  });

  test('recognizes production agreement hosts only', () => {
    expect(isProductionAgreementHost('9jobs.co')).toBe(true);
    expect(isProductionAgreementHost('www.9jobs.co')).toBe(true);
    expect(isProductionAgreementHost('9jobs-frontend-live-staging.vercel.app')).toBe(false);
  });

  test('uses internal flow on preview hosts even when docusign is configured', () => {
    expect(
      resolveEsignProvider({
        configuredProvider: 'docusign',
        hostname: '9jobs-frontend-live-staging.vercel.app',
      })
    ).toBe('internal');
  });

  test('uses docusign only on production hosts when configured explicitly', () => {
    expect(
      resolveEsignProvider({
        configuredProvider: 'docusign',
        hostname: '9jobs.co',
      })
    ).toBe('docusign');
  });

  test('uses internal flow when configured explicitly', () => {
    expect(
      resolveEsignProvider({
        configuredProvider: ' internal ',
        hostname: '9jobs.co',
      })
    ).toBe('internal');
  });

  test('defaults to internal when provider is missing', () => {
    expect(
      resolveEsignProvider({
        configuredProvider: '',
        hostname: '9jobs.co',
      })
    ).toBe('internal');
  });
});
