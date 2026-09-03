import { NextResponse } from 'next/server';

import { createInitialAdminUser } from '@/lib/admin/auth/admin-user-service';
import { adminSignupSchema } from '@/lib/admin/auth/admin-auth-schemas';
import { getAdminSessionCookieOptions } from '@/lib/admin/auth/cookies';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin/auth/constants';
import { createAdminSessionToken } from '@/lib/admin/auth/session';

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = adminSignupSchema.parse(body);
    const adminUser = await createInitialAdminUser(payload);
    const token = await createAdminSessionToken(adminUser);

    const response = NextResponse.json(
      {
        success: true,
        admin: adminUser,
      },
      {
        status: 201,
      }
    );

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
          error: 'Invalid signup payload.',
        },
        {
          status: 400,
        }
      );
    }

    if (error?.code === 'ADMIN_SIGNUP_DISABLED') {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 403,
        }
      );
    }

    console.error('Admin signup failed:', error);

    return NextResponse.json(
      {
        error: 'Unable to create the admin account.',
      },
      {
        status: 500,
      }
    );
  }
}
