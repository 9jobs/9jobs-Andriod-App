import AdminShell from '@/components/admin/AdminShell';
import AgreementForm from '@/components/admin/AgreementForm';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export default async function NewAgreementPage() {
  await requireAdminPageSession();

  return (
    <AdminShell eyebrow="Create a fresh agreement and open the exact PDF preview instantly." title="New Agreement">
      <AgreementForm />
    </AdminShell>
  );
}
