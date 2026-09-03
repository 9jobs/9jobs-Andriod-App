import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin/auth/constants';
import { verifyAdminSessionToken } from '@/lib/admin/auth/session';

export async function getAdminSessionFromCookieStore(cookieStore) {
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyAdminSessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAdminPageSession() {
  const cookieStore = await cookies();
  const session = await getAdminSessionFromCookieStore(cookieStore);

  if (!session) {
    redirect('/admin/website-admin/login');
  }

  return session;
}

function readSessionTokenFromCookieHeader(request) {
  const cookieHeader = request?.headers?.get?.('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookiesMap = new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split('=');
        return [name, rest.join('=')];
      })
  );

  return cookiesMap.get(ADMIN_SESSION_COOKIE_NAME) || null;
}

export async function requireAdminApiSession(request) {
  const directToken = readSessionTokenFromCookieHeader(request);

  if (directToken) {
    try {
      return await verifyAdminSessionToken(directToken);
    } catch {
      return null;
    }
  }

  try {
    const cookieStore = await cookies();
    return getAdminSessionFromCookieStore(cookieStore);
  } catch {
    return null;
  }
}
