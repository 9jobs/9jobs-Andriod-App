import { NextResponse } from 'next/server';

import { adminResetPasswordSchema } from '@/lib/admin/auth/admin-auth-schemas';
import { resetAdminPassword } from '@/lib/admin/auth/admin-user-service';
import { getAdminSessionCookieOptions } from '@/lib/admin/auth/cookies';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin/auth/constants';
import { createAdminSessionToken } from '@/lib/admin/auth/session';

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = adminResetPasswordSchema.parse(body);
    const adminUser = await resetAdminPassword(payload);

    if (!adminUser) {
      return NextResponse.json(
        {
          error: 'This password reset link is invalid or has expired.',
        },
        {
          status: 400,
        }
      );
    }

    const token = await createAdminSessionToken(adminUser);
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
          error: 'Invalid reset-password payload.',
        },
        {
          status: 400,
        }
      );
    }

    console.error('Admin reset-password failed:', error);

    return NextResponse.json(
      {
        error: 'Unable to reset the password.',
      },
      {
        status: 500,
      }
    );
  }
}
