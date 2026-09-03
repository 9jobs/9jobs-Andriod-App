import AdminShell from '@/components/admin/AdminShell';
import FortnightAgreementForm from '@/components/admin/FortnightAgreementForm';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export default async function NewFortnightAgreementPage() {
  await requireAdminPageSession();

  return (
    <AdminShell eyebrow="Fill parameters and create draft contract" title="Create Fortnight Agreement">
      <FortnightAgreementForm mode="create" />
    </AdminShell>
  );
}
