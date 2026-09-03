import { describe, expect, test } from '@jest/globals';

import { GET as getAdminMe } from '@/app/api/admin/me/route';
import { GET as getAgreements } from '@/app/api/agreements/route';
import { GET as previewAgreementPdf } from '@/app/api/agreements/[id]/preview-pdf/route';
import { GET as downloadSignedAgreement } from '@/app/api/docusign/download/[agreementId]/route';
import { POST as docusignWebhook } from '@/app/api/docusign/webhook/route';

describe('protected admin routes', () => {
  test('rejects unauthenticated admin profile requests', async () => {
    const response = await getAdminMe();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized.');
  });

  test('rejects unauthenticated agreement list requests', async () => {
    const response = await getAgreements();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized.');
  });

  test('rejects unauthenticated PDF preview requests', async () => {
    const response = await previewAgreementPdf(
      new Request('http://localhost/api/agreements/agreement-1/preview-pdf'),
      { params: Promise.resolve({ id: 'agreement-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized.');
  });

  test('rejects unauthenticated signed PDF downloads', async () => {
    const response = await downloadSignedAgreement(
      new Request('http://localhost/api/docusign/download/agreement-1'),
      { params: Promise.resolve({ agreementId: 'agreement-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized.');
  });

  test('rejects invalid DocuSign webhook signatures when a secret is configured', async () => {
    process.env.DOCUSIGN_WEBHOOK_SECRET = 'webhook-secret';

    const response = await docusignWebhook(
      new Request('http://localhost/api/docusign/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-docusign-signature-1': 'invalid-signature',
        },
        body: JSON.stringify({
          envelopeId: 'envelope-1',
          status: 'completed',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid webhook signature.');
  });
});
