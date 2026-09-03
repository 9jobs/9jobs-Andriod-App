import { redirect } from 'next/navigation';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

export default async function NewFortnightInvoicePage() {
  await requireAdminPageSession();
  redirect('/admin/website-admin/invoices/new');
}
