'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function AdminResetPasswordForm({ token }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsPending(true);

    try {
      const response = await fetch('/admin/website-admin/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to reset the password.');
        pushToast({ title: data.error || 'Unable to reset the password.', tone: 'error' });
        return;
      }

      pushToast({ title: 'Password updated successfully.', tone: 'success' });
      startTransition(() => {
        router.push('/admin/website-admin/dashboard');
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="admin-auth-card" onSubmit={handleSubmit}>
      <div>
        <p className="admin-auth-card__eyebrow">Secure Reset</p>
        <h2>Choose a new password</h2>
        <p className="admin-auth-card__text">
          Set a fresh password for your 9Jobs admin account and continue back to the dashboard.
        </p>
      </div>

      <label className="admin-field">
        <span>New password</span>
        <input
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <label className="admin-field">
        <span>Confirm new password</span>
        <input
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      {error ? <p className="admin-error-text">{error}</p> : null}

      <button className="admin-primary-button admin-primary-button--full" disabled={isPending} type="submit">
        {isPending ? 'Updating password...' : 'Reset password'}
      </button>
    </form>
  );
}
