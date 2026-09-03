import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import AgreementForm from '@/components/admin/AgreementForm';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import { getAgreementById } from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

export default async function EditAgreementPage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;
  const agreement = await getAgreementById(id);

  if (!agreement) {
    notFound();
  }

  return (
    <AdminShell eyebrow="Update agreement details and regenerate the preview" title="Edit Agreement">
      <AgreementForm agreementId={agreement._id} initialValues={agreement} mode="edit" />
    </AdminShell>
  );
}
