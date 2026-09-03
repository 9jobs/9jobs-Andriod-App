import crypto from 'node:crypto';

const DOCUSIGN_TOKEN_AUDIENCE = 'account-d.docusign.com';
const DOCUSIGN_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
let cachedDocuSignToken = null;
let cachedDocuSignTokenExpiresAt = 0;
let docuSignTokenPromise = null;

export function hasDocuSignRuntimeConfig() {
  return Boolean(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
      process.env.DOCUSIGN_USER_ID &&
      process.env.DOCUSIGN_ACCOUNT_ID &&
      process.env.DOCUSIGN_BASE_PATH &&
      process.env.DOCUSIGN_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_APP_URL
  );
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getDocuSignConfig() {
  const config = {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
    userId: process.env.DOCUSIGN_USER_ID,
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    basePath: process.env.DOCUSIGN_BASE_PATH,
    authServer: process.env.DOCUSIGN_AUTH_SERVER || DOCUSIGN_TOKEN_AUDIENCE,
    privateKey: process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    webhookSecret: process.env.DOCUSIGN_WEBHOOK_SECRET || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };

  for (const [key, value] of Object.entries(config)) {
    if (!value && key !== 'webhookSecret') {
      throw new Error(`Missing DocuSign configuration: ${key}`);
    }
  }

  return config;
}

function signJwtAssertion(claims, privateKey) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signer = crypto.createSign('RSA-SHA256');

  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();

  const signature = signer
    .sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function getDocuSignAccessToken() {
  const nowMs = Date.now();

  if (
    cachedDocuSignToken &&
    cachedDocuSignTokenExpiresAt - DOCUSIGN_TOKEN_REFRESH_BUFFER_MS > nowMs
  ) {
    return cachedDocuSignToken;
  }

  if (docuSignTokenPromise) {
    return docuSignTokenPromise;
  }

  docuSignTokenPromise = (async () => {
    const config = getDocuSignConfig();
    const now = Math.floor(Date.now() / 1000);
    const assertion = signJwtAssertion(
      {
        iss: config.integrationKey,
        sub: config.userId,
        aud: config.authServer,
        iat: now,
        exp: now + 3600,
        scope: 'signature impersonation',
      },
      config.privateKey
    );

    const response = await fetch(`https://${config.authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`DocuSign auth failed (${response.status}).`);
    }

    const data = await response.json();
    const tokenPayload = {
      accessToken: data.access_token,
      config,
    };

    cachedDocuSignToken = tokenPayload;
    cachedDocuSignTokenExpiresAt = nowMs + Number(data.expires_in || 3600) * 1000;

    return tokenPayload;
  })();

  try {
    return await docuSignTokenPromise;
  } finally {
    docuSignTokenPromise = null;
  }
}

async function docusignRequest(pathname, options = {}) {
  const { timeoutMs, ...requestOptions } = options;
  const { accessToken, config } = await getDocuSignAccessToken();
  const response = await fetch(`${config.basePath}/v2.1/accounts/${config.accountId}${pathname}`, {
    ...requestOptions,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(requestOptions.headers || {}),
    },
    ...(typeof timeoutMs === 'number' && timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`DocuSign request failed (${response.status}): ${details}`);
  }

  return response;
}

export async function createDocuSignEnvelope({ agreement, pdfBuffer }) {
  const eventNotification = {
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/docusign/webhook`,
    loggingEnabled: 'true',
    requireAcknowledgment: 'true',
    includeDocuments: 'false',
    includeHMAC: 'true',
    envelopeEvents: [
      { envelopeEventStatusCode: 'sent' },
      { envelopeEventStatusCode: 'delivered' },
      { envelopeEventStatusCode: 'completed' },
      { envelopeEventStatusCode: 'declined' },
      { envelopeEventStatusCode: 'voided' },
    ],
  };

  const payload = {
    emailSubject: `9Jobs Agreement for ${agreement.clientName}`,
    status: 'sent',
    documents: [
      {
        documentBase64: pdfBuffer.toString('base64'),
        name: `9jobs-service-contract-${agreement._id}.pdf`,
        fileExtension: 'pdf',
        documentId: '1',
      },
    ],
    recipients: {
      signers: [
        {
          email: agreement.clientEmail,
          name: agreement.clientName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                anchorString: '[[DS_CUSTOMER_SIGN_HERE]]',
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
            dateSignedTabs: [
              {
                anchorString: '[[DS_CUSTOMER_DATE_HERE]]',
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
          },
        },
        ...(agreement.providerEmail
          ? [
              {
                email: agreement.providerEmail,
                name: agreement.providerSignatureName || agreement.providerName || '9Jobs Admin',
                recipientId: '2',
                routingOrder: '1',
                tabs: {
                  signHereTabs: [
                    {
                      anchorString: '[[DS_PROVIDER_SIGN_HERE]]',
                      anchorUnits: 'pixels',
                      anchorXOffset: '0',
                      anchorYOffset: '0',
                    },
                  ],
                  dateSignedTabs: [
                    {
                      anchorString: '[[DS_PROVIDER_DATE_HERE]]',
                      anchorUnits: 'pixels',
                      anchorXOffset: '0',
                      anchorYOffset: '0',
                    },
                  ],
                },
              },
            ]
          : []),
      ],
      carbonCopies: [],
    },
    eventNotification,
  };

  const response = await docusignRequest('/envelopes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function getDocuSignEnvelopeStatus(envelopeId, options = {}) {
  const response = await docusignRequest(`/envelopes/${envelopeId}`, {
    method: 'GET',
    ...options,
  });

  return response.json();
}

export async function downloadCompletedEnvelopePdf(envelopeId) {
  const { accessToken, config } = await getDocuSignAccessToken();
  const response = await fetch(
    `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}/documents/combined`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Unable to download signed DocuSign PDF (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}
