import { AdminDetailSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminFortnightInvoiceDetailLoading() {
  return (
    <AdminShellLoading titleWidth="300px" eyebrowWidth="340px">
      <AdminDetailSkeleton />
    </AdminShellLoading>
  );
}
