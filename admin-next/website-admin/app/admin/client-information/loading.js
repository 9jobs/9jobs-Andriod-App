import { AdminPanelSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminClientInformationLoading() {
  return (
    <AdminShellLoading titleWidth="260px" eyebrowWidth="320px">
      <AdminPanelSkeleton columns={8} rows={6} />
    </AdminShellLoading>
  );
}
