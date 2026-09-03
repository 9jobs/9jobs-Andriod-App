import { NextResponse } from 'next/server';

import { getAdminSessionCookieOptions } from '@/lib/admin/auth/cookies';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin/auth/constants';

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
