import { describe, expect, test } from '@jest/globals';
import { GET, POST } from '../app/api/docusign/callback/route';

describe('DocuSign OAuth callback API route', () => {
  test('handles successful callback with code parameter (GET)', async () => {
    const request = new Request('https://9jobs.co/api/docusign/callback?code=mock_authorization_code_123&state=xyz_state');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('DocuSign OAuth consent completed successfully.');
    expect(body.authorizationCode).toBe('mock_authorization_code_123');
  });

  test('handles error callback when error parameter exists (GET)', async () => {
    const request = new Request('https://9jobs.co/api/docusign/callback?error=consent_required&error_description=User+refused+consent');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('consent_required');
    expect(body.description).toBe('User refused consent');
  });

  test('handles invalid request missing required params (GET)', async () => {
    const request = new Request('https://9jobs.co/api/docusign/callback?state=xyz_state');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('invalid_request');
    expect(body.description).toContain('Required query parameters');
  });

  test('handles successful callback with code parameter (POST)', async () => {
    const request = new Request('https://9jobs.co/api/docusign/callback?code=mock_post_code_456', {
      method: 'POST',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.authorizationCode).toBe('mock_post_code_456');
  });
});
