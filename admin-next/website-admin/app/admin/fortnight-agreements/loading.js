import { AdminPanelSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminFortnightAgreementsLoading() {
  return (
    <AdminShellLoading titleWidth="300px" eyebrowWidth="340px">
      <AdminPanelSkeleton columns={7} rows={6} />
    </AdminShellLoading>
  );
}
