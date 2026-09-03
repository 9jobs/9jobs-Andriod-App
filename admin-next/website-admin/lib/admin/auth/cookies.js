import { ADMIN_SESSION_MAX_AGE } from '@/lib/admin/auth/constants';

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin/website-admin',
    maxAge: ADMIN_SESSION_MAX_AGE,
  };
}
