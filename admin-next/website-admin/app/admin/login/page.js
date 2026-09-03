import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { getAdminSessionFromCookieStore } from '@/lib/admin/auth/require-admin';

export const metadata = {
  title: 'Admin Login | 9Jobs',
};

export default async function AdminLoginPage({ searchParams }) {
  const session = await getAdminSessionFromCookieStore(await cookies());

  if (session) {
    redirect('/admin/website-admin/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const requestedNextPath =
    typeof resolvedSearchParams?.next === 'string' ? resolvedSearchParams.next : '/admin/website-admin/dashboard';
  const nextPath = requestedNextPath.startsWith('/admin') ? requestedNextPath : '/admin/website-admin/dashboard';

  return (
    <main className="admin-auth-shell">
      <div className="admin-auth-shell__panel">
        <p className="admin-auth-shell__label">9Jobs Agreement Console</p>
        <h1>Secure contract creation, preview, and DocuSign delivery.</h1>
        <p className="admin-auth-shell__text">
          Sign in to one private admin workspace, generate the 9 Jobs Service Contract, review the exact PDF, and send the same file to clients through DocuSign.
        </p>
      </div>
      <AdminLoginForm nextPath={nextPath} />
    </main>
  );
}
