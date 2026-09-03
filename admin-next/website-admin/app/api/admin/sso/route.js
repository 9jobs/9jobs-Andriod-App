import { NextResponse } from 'next/server';

import { getAdminSessionCookieOptions } from '@/lib/admin/auth/cookies';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin/auth/constants';
import { createAdminSessionToken } from '@/lib/admin/auth/session';

const backendUrl = process.env.HOST_BACKEND_URL || 'https://backend-theta-ten-27.vercel.app';

function readHostAdmin(token) {
  const payload = String(token || '').split('.')[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export async function POST(request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const hostAdmin = readHostAdmin(token);

  if (!token || hostAdmin?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Validate the host JWT with the existing backend before issuing this app's session.
  const validation = await fetch(`${backendUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!validation.ok) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const session = await createAdminSessionToken({
    id: String(hostAdmin.userId || ''),
    email: String(hostAdmin.email || ''),
    name: '9Jobs Administrator',
  });
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, session, getAdminSessionCookieOptions());
  return response;
}
