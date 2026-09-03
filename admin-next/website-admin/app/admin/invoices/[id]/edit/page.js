import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import InvoiceForm from '@/components/admin/InvoiceForm';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import { getInvoiceById } from '@/lib/invoices/service';

export const dynamic = 'force-dynamic';

export default async function EditInvoicePage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <AdminShell eyebrow="Update invoice fields and regenerate the PDF" title="Edit Invoice">
      <InvoiceForm initialValues={invoice} invoiceId={invoice._id} mode="edit" />
    </AdminShell>
  );
}
