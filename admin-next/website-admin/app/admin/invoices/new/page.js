import AdminShell from '@/components/admin/AdminShell';
import UnifiedInvoiceBuilder from '@/components/admin/UnifiedInvoiceBuilder';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import { suggestNextInvoiceDetails } from '@/lib/invoices/service';
import { suggestNextFortnightInvoiceDetails } from '@/lib/fortnight-invoices/service';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  await requireAdminPageSession();
  const [weeklyDefaults, fortnightDefaults] = await Promise.all([
    suggestNextInvoiceDetails(),
    suggestNextFortnightInvoiceDetails(),
  ]);

  return (
    <AdminShell eyebrow="Create weekly, fortnight, and onboarding invoices from one fixed flow" title="Create Invoice">
      <UnifiedInvoiceBuilder fortnightDefaults={fortnightDefaults} weeklyDefaults={weeklyDefaults} />
    </AdminShell>
  );
}
