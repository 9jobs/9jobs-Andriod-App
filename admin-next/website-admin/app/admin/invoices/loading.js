import { AdminPanelSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminInvoicesLoading() {
  return (
    <AdminShellLoading titleWidth="160px" eyebrowWidth="380px">
      <AdminPanelSkeleton columns={7} rows={7} />
    </AdminShellLoading>
  );
}
