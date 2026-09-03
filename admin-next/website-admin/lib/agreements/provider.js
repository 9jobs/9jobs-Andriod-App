const PRODUCTION_HOSTS = new Set(['9jobs.co', 'www.9jobs.co']);

export function normalizeEsignProvider(value) {
  return String(value || '').trim().toLowerCase();
}

export function isProductionAgreementHost(hostname) {
  return PRODUCTION_HOSTS.has(String(hostname || '').trim().toLowerCase());
}

export function resolveEsignProvider({ configuredProvider, hostname }) {
  const normalizedProvider = normalizeEsignProvider(configuredProvider);

  if (normalizedProvider === 'internal') {
    return 'internal';
  }

  // Only production hosts are allowed to trigger the legacy DocuSign path.
  if (normalizedProvider === 'docusign' && isProductionAgreementHost(hostname)) {
    return 'docusign';
  }

  return 'internal';
}
