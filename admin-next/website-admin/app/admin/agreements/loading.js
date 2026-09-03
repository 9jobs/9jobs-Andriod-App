import { AdminPanelSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminAgreementsLoading() {
  return (
    <AdminShellLoading titleWidth="220px" eyebrowWidth="280px">
      <AdminPanelSkeleton columns={6} rows={6} />
    </AdminShellLoading>
  );
}
