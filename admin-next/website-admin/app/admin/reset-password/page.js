import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import AdminResetPasswordForm from '@/components/admin/AdminResetPasswordForm';
import { getAdminSessionFromCookieStore } from '@/lib/admin/auth/require-admin';

export const metadata = {
  title: 'Reset Admin Password | 9Jobs',
};

export default async function AdminResetPasswordPage({ searchParams }) {
  const session = await getAdminSessionFromCookieStore(await cookies());

  if (session) {
    redirect('/admin/website-admin/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const token = typeof resolvedSearchParams?.token === 'string' ? resolvedSearchParams.token : '';

  return (
    <main className="admin-auth-shell">
      <div className="admin-auth-shell__panel">
        <p className="admin-auth-shell__label">9Jobs Agreement Console</p>
        <h1>Recover secure admin access without exposing agreement data.</h1>
        <p className="admin-auth-shell__text">
          Reset links expire automatically and are only valid for the admin email that requested them.
        </p>
      </div>
      {token ? (
        <AdminResetPasswordForm token={token} />
      ) : (
        <div className="admin-auth-card">
          <p className="admin-auth-card__eyebrow">Reset Link Required</p>
          <h2>Missing reset token</h2>
          <p className="admin-auth-card__text">
            Open the secure password reset link from your email to continue.
          </p>
        </div>
      )}
    </main>
  );
}
