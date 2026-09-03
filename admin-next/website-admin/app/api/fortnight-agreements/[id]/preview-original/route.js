import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import connectDB from '@/utils/db';
import FortnightAgreement from '@/models/FortnightAgreement';
import { hashToken, constantTimeCompare } from '@/utils/cryptoUtils';
import { fetchBlobBuffer, fetchBlobBufferByKey, openDownloadStreamByKey } from '@/lib/storage/blob';
import { isRateLimited } from '@/utils/rateLimiter';

export const dynamic = 'force-dynamic';

function canPreviewAfterTokenUse({ isClient, status }) {
  return ['sent_to_client', 'client_signed', 'completion_processing', 'completed'].includes(status);
}

export async function GET(request, { params }) {
  await connectDB();
  const id = (await params).id;

  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get('token') || '';

  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const isLimited = await isRateLimited(`ip:${clientIp}:fortnight-preview-original`, 10, 60 * 1000);
  if (isLimited) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
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

  const tokenHash = hashToken(rawToken);
  
  const agreement = await FortnightAgreement.findOne({
    _id: id,
    $or: [
      { clientSigningTokenHash: tokenHash },
      { providerSigningTokenHash: tokenHash }
    ]
  });

  if (!agreement) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Invalid token.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  const isClient = constantTimeCompare(agreement.clientSigningTokenHash, tokenHash);
  const expiry = isClient ? agreement.clientTokenExpiresAt : agreement.providerTokenExpiresAt;
  const usedAt = isClient ? agreement.clientTokenUsedAt : agreement.providerTokenUsedAt;

  if (usedAt && !canPreviewAfterTokenUse({ isClient, status: agreement.status })) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Token has already been used.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (new Date() > expiry) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Token has expired.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }

  const allowUsedPreview = Boolean(usedAt) && canPreviewAfterTokenUse({ isClient, status: agreement.status });

  if (!['sent_to_client', 'client_signed'].includes(agreement.status) && !allowUsedPreview) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Contract is not in a signable state.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    if (agreement.originalPdfStorageKey) {
      const { stream } = await openDownloadStreamByKey(agreement.originalPdfStorageKey);
      return new NextResponse(Readable.toWeb(stream), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'cache-control': 'private, no-store, no-cache, must-revalidate',
          'x-robots-tag': 'noindex, nofollow, nosnippet',
        },
      });
    }

    const fallbackKey = agreement.generatedPdfPath;
    if (fallbackKey) {
      const { stream } = await openDownloadStreamByKey(fallbackKey);
      return new NextResponse(Readable.toWeb(stream), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'cache-control': 'private, no-store, no-cache, must-revalidate',
          'x-robots-tag': 'noindex, nofollow, nosnippet',
        },
      });
    }

    const url = agreement.originalPdfUrl || agreement.generatedPdfUrl;
    if (!url) {
      return new NextResponse(JSON.stringify({ error: 'Original PDF is not available.' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }
    let pdfBuffer;
    if (url.startsWith('data:application/pdf;base64,')) {
      const base64Data = url.substring(url.indexOf(',') + 1);
      pdfBuffer = Buffer.from(base64Data, 'base64');
    } else {
      pdfBuffer = await fetchBlobBuffer(url);
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'cache-control': 'private, no-store, no-cache, must-revalidate',
        'x-robots-tag': 'noindex, nofollow, nosnippet',
      },
    });
  } catch (err) {
    console.error('Failed to fetch original PDF:', err);
    return new NextResponse(JSON.stringify({ error: 'Failed to retrieve original PDF file from storage.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
