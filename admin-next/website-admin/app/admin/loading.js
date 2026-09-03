import { AdminHomeSkeleton, AdminShellLoading } from '@/components/admin/AdminLoading';

export default function AdminLoading() {
  return (
    <AdminShellLoading titleWidth="340px" eyebrowWidth="200px">
      <AdminHomeSkeleton />
    </AdminShellLoading>
  );
}
