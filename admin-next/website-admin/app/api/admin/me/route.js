import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export async function GET(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return NextResponse.json(
      {
        error: 'Unauthorized.',
      },
      {
        status: 401,
      }
    );
  }

  return NextResponse.json({
    authenticated: true,
    admin: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}
