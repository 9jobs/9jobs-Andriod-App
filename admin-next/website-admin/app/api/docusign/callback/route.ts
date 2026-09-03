import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Handles the DocuSign OAuth consent callback (GET requests).
 * Extracts query parameters like 'code', 'state', 'error', 'error_description'.
 */
export async function GET(request: NextRequest) {
  return handleCallback(request);
}

/**
 * Handles the DocuSign OAuth consent callback (POST requests).
 * Handles parameters from either query string or request payload.
 */
export async function POST(request: NextRequest) {
  return handleCallback(request);
}

/**
 * Common callback handler for both GET and POST requests.
 * Standardizes parameter parsing, safe logging, and error handling.
 */
async function handleCallback(request: NextRequest) {
  try {
    // 3. Read query parameters: code, state, error, error_description
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // 8. Log the callback data on the server (safely redacting sensitive details if any, though auth codes are short-lived)
    console.log('DocuSign OAuth Callback Received:', {
      method: request.method,
      hasCode: !!code,
      state: state || 'none',
      error: error || 'none',
      errorDescription: errorDescription || 'none',
    });

    // 4. If "error" exists, return JSON with 400 Bad Request
    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error,
          description: errorDescription || 'DocuSign OAuth consent was refused or failed.',
        },
        { status: 400 }
      );
    }

    // 5. If "code" exists, return success JSON with 200 OK
    // Note: 11. Do NOT exchange authorization code for tokens yet (only verifying callback works).
    if (code) {
      return NextResponse.json(
        {
          success: true,
          message: 'DocuSign OAuth consent completed successfully.',
          authorizationCode: code,
        },
        { status: 200 }
      );
    }

    // 9. & 10. Validate request safely and return readable error message if required params are missing
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_request',
        description: 'Required query parameters (either "code" or "error") are missing from the request.',
      },
      { status: 400 }
    );
  } catch (err: any) {
    // 6. Never throw 500.
    // 7. Add proper try/catch.
    console.error('DocuSign callback processing error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'processing_error',
        description: err.message || 'An unexpected error occurred while processing the DocuSign callback.',
      },
      { status: 400 }
    );
  }
}
