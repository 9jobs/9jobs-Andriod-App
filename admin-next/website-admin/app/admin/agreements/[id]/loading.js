import { AdminDetailSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminAgreementDetailLoading() {
  return (
    <AdminShellLoading titleWidth="260px" eyebrowWidth="250px">
      <AdminDetailSkeleton />
    </AdminShellLoading>
  );
}
