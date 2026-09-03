import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import ClientInfo from '@/models/ClientInfo';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await connectDB();
    
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const submissions = await ClientInfo.find({}).sort({ createdAt: -1 });

    return NextResponse.json(submissions, { status: 200 });
  } catch (error) {
    console.error('Admin Client Info API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve client submissions.' }, { status: 500 });
  }
}
