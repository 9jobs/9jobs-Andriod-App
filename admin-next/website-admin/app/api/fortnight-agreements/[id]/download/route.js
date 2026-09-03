import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import connectDB from '@/utils/db';
import FortnightAgreement from '@/models/FortnightAgreement';
import { hashToken } from '@/utils/cryptoUtils';
import { openDownloadStreamByKey } from '@/lib/storage/blob';
import { isRateLimited } from '@/utils/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  await connectDB();
  const id = (await params).id;
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get('token') || '';

  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (await isRateLimited(`ip:${clientIp}:fortnight-completed-download`, 10, 60 * 1000)) {
    return new NextResponse(JSON.stringify({ error: 'Too many download attempts. Please wait.' }), {
      status: 429,
      headers: { 'content-type': 'application/json' }
    });
  }

  let agreement = null;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    agreement = await FortnightAgreement.findOne({
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

    if (agreement.downloadTokenExpiresAt && new Date() > agreement.downloadTokenExpiresAt) {
      return new NextResponse(JSON.stringify({ error: 'Access denied: Download link has expired.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' }
      });
    }
  } else {
    // Admin Session auth check
    const { requireAdminApiSession } = require('@/lib/admin/auth/require-admin');
    const session = await requireAdminApiSession(request);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }
    agreement = await FortnightAgreement.findById(id);
    if (!agreement) {
      return new NextResponse(JSON.stringify({ error: 'Contract not found.' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  if (agreement.status !== 'completed') {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Contract is not completed.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }

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
