import connectDB from '@/utils/db';
import ClientInfo from '@/models/ClientInfo';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import AdminShell from '@/components/admin/AdminShell';
import ClientInfoList from '@/components/admin/ClientInfoList';

export const dynamic = 'force-dynamic';

export default async function AdminClientInformationPage() {
  await requireAdminPageSession();
  await connectDB();
  
  const submissions = await ClientInfo.find({})
    .select([
      'fullName',
      'contactNo',
      'workingRights',
      'address',
      'dob',
      'expectedSalary',
      'preferredJobLocation',
      'workType',
      'noticePeriod',
      'email',
      'password',
      'preferredRole',
      'resumeFileName',
      'coverLetterFileName',
      'billing',
      'createdAt',
      'updatedAt',
    ].join(' '))
    .sort({ createdAt: -1 })
    .lean();

  // Convert Mongoose documents to plain JSON objects to prevent Next.js serialization warnings
  const plainSubmissions = submissions.map((doc) => {
    return {
      ...doc,
      _id: String(doc._id),
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    };
  });

  return (
    <AdminShell eyebrow="View and manage client onboarding submissions" title="Client Information">
      <ClientInfoList initialSubmissions={plainSubmissions} />
    </AdminShell>
  );
}
