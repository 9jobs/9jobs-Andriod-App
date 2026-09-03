import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import ClientInfo from '@/models/ClientInfo';
import { deleteStoredFileByKey } from '@/lib/storage/blob';
import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await ClientInfo.findByIdAndUpdate(
      id,
      {
        fullName: body.fullName,
        contactNo: body.contactNo,
        workingRights: body.workingRights,
        workingRightsCustom: body.workingRightsCustom,
        address: body.address,
        dob: body.dob,
        expectedSalary: body.expectedSalary,
        preferredJobLocation: body.preferredJobLocation,
        workType: body.workType,
        noticePeriod: body.noticePeriod,
        email: body.email,
        password: body.password,
        preferredRole: body.preferredRole,
        billing: {
          ...(body.billing || {}),
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Client submission not found.' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Update client info error:', error);
    return NextResponse.json({ error: 'Failed to update client submission.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const session = await requireAdminApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const clientInfo = await ClientInfo.findById(id);

    if (!clientInfo) {
      return NextResponse.json({ error: 'Client submission not found.' }, { status: 404 });
    }

    // Clean up resume from GridFS if present
    if (clientInfo.resumeStorageKey) {
      await deleteStoredFileByKey(clientInfo.resumeStorageKey).catch((err) => {
        console.error('Error deleting resume file from GridFS:', err);
      });
    }

    if (clientInfo.coverLetterStorageKey) {
      await deleteStoredFileByKey(clientInfo.coverLetterStorageKey).catch((err) => {
        console.error('Error deleting cover letter file from GridFS:', err);
      });
    }

    await ClientInfo.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Client submission deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Delete client info error:', error);
    return NextResponse.json({ error: 'Failed to delete client submission.' }, { status: 500 });
  }
}
