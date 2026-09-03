import { AdminDetailSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminFortnightAgreementDetailLoading() {
  return (
    <AdminShellLoading titleWidth="320px" eyebrowWidth="250px">
      <AdminDetailSkeleton />
    </AdminShellLoading>
  );
}
