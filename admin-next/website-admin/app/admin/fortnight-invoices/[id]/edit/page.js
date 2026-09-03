import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import FortnightInvoiceForm from '@/components/admin/FortnightInvoiceForm';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import { getFortnightInvoiceById } from '@/lib/fortnight-invoices/service';

export const dynamic = 'force-dynamic';

export default async function EditFortnightInvoicePage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;
  const invoice = await getFortnightInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <AdminShell eyebrow="Update invoice fields and regenerate the PDF" title="Edit Fortnight Invoice">
      <FortnightInvoiceForm initialValues={invoice} invoiceId={invoice._id} mode="edit" />
    </AdminShell>
  );
}
