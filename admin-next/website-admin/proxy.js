import { NextResponse } from 'next/server';

export function proxy(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-9jobs-admin-route', '1');
  requestHeaders.set('x-9jobs-admin-embedded', '1');

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
