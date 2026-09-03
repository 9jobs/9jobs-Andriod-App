import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import connectDB from '@/utils/db';
import ClientInfo from '@/models/ClientInfo';
import { openDownloadStreamByKey } from '@/lib/storage/blob';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const session = await requireAdminApiSession(request);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    const { id } = await params;
    const clientInfo = await ClientInfo.findById(id);

    if (!clientInfo || !clientInfo.coverLetterStorageKey) {
      return new NextResponse(JSON.stringify({ error: 'Cover letter not found.' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }

    const { stream, file } = await openDownloadStreamByKey(clientInfo.coverLetterStorageKey);
    const contentType = file.contentType || 'application/octet-stream';
    const fileName = clientInfo.coverLetterFileName || `cover-letter-${id}.pdf`;

    return new NextResponse(Readable.toWeb(stream), {
      status: 200,
      headers: {
        'content-type': contentType,
        'content-disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'cache-control': 'private, no-store, no-cache, must-revalidate',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('Download cover letter error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to download cover letter.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
