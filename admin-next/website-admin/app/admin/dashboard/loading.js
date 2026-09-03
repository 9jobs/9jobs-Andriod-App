import { AdminHomeSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminDashboardLoading() {
  return (
    <AdminShellLoading titleWidth="320px" eyebrowWidth="180px">
      <AdminHomeSkeleton />
    </AdminShellLoading>
  );
}
