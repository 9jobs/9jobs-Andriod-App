import { NextResponse } from 'next/server';

import { authenticateAdminUser } from '@/lib/admin/auth/admin-user-service';
import { getAdminSessionCookieOptions } from '@/lib/admin/auth/cookies';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin/auth/constants';
import { verifyAdminCredentials } from '@/lib/admin/auth/credentials';
import { adminLoginSchema } from '@/lib/admin/auth/login-schema';
import { enforceLoginRateLimit, resetLoginRateLimit } from '@/lib/admin/auth/rate-limit';
import { createAdminSessionToken } from '@/lib/admin/auth/session';

function getRequestKey(request) {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

function buildRateLimitKey(request, email = '') {
  const requestKey = String(getRequestKey(request) || 'local').trim().toLowerCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return normalizedEmail ? `${requestKey}:${normalizedEmail}` : requestKey;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const credentials = adminLoginSchema.parse(body);
    const rateLimitKey = buildRateLimitKey(request, credentials.email);
    const rateLimit = enforceLoginRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'retry-after': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    let adminSessionPayload = null;

    try {
      const isValidAdmin = await verifyAdminCredentials(credentials);

      if (isValidAdmin) {
        adminSessionPayload = {
          email: credentials.email.trim().toLowerCase(),
          name: '9Jobs Admin',
        };
      }
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'Admin credentials are not configured.') {
        throw error;
      }

      adminSessionPayload = await authenticateAdminUser(credentials);
    }

    if (!adminSessionPayload) {
      return NextResponse.json(
        {
          error: 'Invalid admin credentials.',
        },
        {
          status: 401,
        }
      );
    }

    resetLoginRateLimit(rateLimitKey);

    const token = await createAdminSessionToken(adminSessionPayload);

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE_NAME,
      token,
      getAdminSessionCookieOptions()
    );

    return response;
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid login payload.',
        },
        {
          status: 400,
        }
      );
    }

    console.error('Admin login failed:', error);

    return NextResponse.json(
      {
        error: 'Unable to complete admin login.',
      },
      {
        status: 500,
      }
    );
  }
}
