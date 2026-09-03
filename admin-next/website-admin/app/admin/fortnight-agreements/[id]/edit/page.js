import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import FortnightAgreementForm from '@/components/admin/FortnightAgreementForm';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import { getAgreementById } from '@/lib/fortnight-agreements/service';

export const dynamic = 'force-dynamic';

export default async function EditFortnightAgreementPage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;
  const agreement = await getAgreementById(id);

  if (!agreement) {
    notFound();
  }

  return (
    <AdminShell eyebrow="Modify draft contract parameters" title="Edit Fortnight Agreement">
      <FortnightAgreementForm agreementId={agreement._id} initialValues={agreement} mode="edit" />
    </AdminShell>
  );
}
