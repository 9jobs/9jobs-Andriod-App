import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import connectDB from '@/utils/db';
import Agreement from '@/models/Agreement';
import { hashToken, constantTimeCompare } from '@/utils/cryptoUtils';
import { openDownloadStreamByKey } from '@/lib/storage/blob';
import { isRateLimited } from '@/utils/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  await connectDB();
  const id = (await params).id;
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get('token') || '';

  // 1. Rate Limiting Protection (max 10 downloads per minute per IP)
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (await isRateLimited(`ip:${clientIp}:completed-download`, 10, 60 * 1000)) {
    return new NextResponse(JSON.stringify({ error: 'Too many download attempts. Please wait.' }), {
      status: 429,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (!rawToken) {
    return new NextResponse(JSON.stringify({ error: 'Missing token parameter.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 2. Resolve token securely using SHA-256 hash
  const tokenHash = hashToken(rawToken);
  const agreement = await Agreement.findOne({
    _id: id,
    $or: [
      { clientDownloadTokenHash: tokenHash },
      { providerDownloadTokenHash: tokenHash }
    ]
  });

  if (!agreement) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Invalid download token.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 3. Check token expiry
  if (agreement.downloadTokenExpiresAt && new Date() > agreement.downloadTokenExpiresAt) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Download link has expired.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 4. Verify completed state
  if (agreement.status !== 'completed') {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Agreement is not completed.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 5. Fetch Sealed PDF Buffer using storage key
  if (!agreement.signedPdfStorageKey) {
    return new NextResponse(JSON.stringify({ error: 'Signed document is not available.' }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const { stream } = await openDownloadStreamByKey(agreement.signedPdfStorageKey);
    return new NextResponse(Readable.toWeb(stream), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="9jobs-completed-agreement-${id}.pdf"`,
        'cache-control': 'private, no-store, no-cache, must-revalidate',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  } catch (err) {
    console.error('Failed to download completed PDF:', err);
    return new NextResponse(JSON.stringify({ error: 'Failed to retrieve completed document from storage.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

}
