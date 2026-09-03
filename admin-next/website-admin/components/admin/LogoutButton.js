'use client';

import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function LogoutButton() {
  const router = useRouter();
  const { pushToast } = useToast();

  async function handleLogout() {
    const response = await fetch('/admin/website-admin/api/admin/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      pushToast({ title: 'Unable to log out right now.', tone: 'error' });
      return;
    }

    pushToast({ title: 'Logged out.', tone: 'success' });
    router.push('/admin/website-admin/login');
    router.refresh();
  }

  return (
    <button className="admin-ghost-button" onClick={handleLogout} type="button">
      Logout
    </button>
  );
}
