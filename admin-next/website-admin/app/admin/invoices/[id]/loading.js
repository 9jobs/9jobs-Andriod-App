import { AdminDetailSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminInvoiceDetailLoading() {
  return (
    <AdminShellLoading titleWidth="260px" eyebrowWidth="300px">
      <AdminDetailSkeleton />
    </AdminShellLoading>
  );
}
