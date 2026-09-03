import { NextResponse } from 'next/server';

import { adminForgotPasswordSchema } from '@/lib/admin/auth/admin-auth-schemas';
import { requestAdminPasswordReset } from '@/lib/admin/auth/admin-user-service';

function getAppUrl(request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = adminForgotPasswordSchema.parse(body);

    await requestAdminPasswordReset({
      email: payload.email,
      appUrl: getAppUrl(request),
    });

    return NextResponse.json({
      success: true,
      message: 'If the account exists, a password reset link has been sent.',
    });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid forgot-password payload.',
        },
        {
          status: 400,
        }
      );
    }

    if (error?.code === 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 503,
        }
      );
    }

    console.error('Admin forgot-password failed:', error);

    return NextResponse.json(
      {
        error: 'Unable to process the password reset request.',
      },
      {
        status: 500,
      }
    );
  }
}
