'use client';

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function AdminLoginForm({ nextPath = '/admin/website-admin/dashboard' }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsPending(true);

    try {
      const response = await fetch('/admin/website-admin/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to log in.');
        pushToast({ title: data.error || 'Unable to log in.', tone: 'error' });
        return;
      }

      pushToast({
        title: 'Admin login successful.',
        tone: 'success',
      });
      router.push(nextPath || '/admin/website-admin/dashboard');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="admin-auth-card" onSubmit={handleSubmit}>
      <div>
        <p className="admin-auth-card__eyebrow">Secure Access</p>
        <h2>Admin Login</h2>
        <p className="admin-auth-card__text">
          Protected sign-in for creating agreements, reviewing the contract PDF, and sending the final file through DocuSign.
        </p>
      </div>

      <div className="admin-auth-card__security-strip" aria-label="Admin security highlights">
        <span>Internal admin only</span>
        <span>PDF preview locked</span>
        <span>DocuSign send control</span>
      </div>

      <label className="admin-field">
        <span>Email</span>
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="admin-field">
        <span>Password</span>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            style={{ width: '100%', paddingRight: '55px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '0.88rem',
              fontWeight: '600',
              padding: '4px',
              userSelect: 'none',
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>

      {error ? <p className="admin-error-text">{error}</p> : null}
      <p className="admin-auth-note">
        Only the configured private admin account can access the agreement console.
      </p>

      <button className="admin-primary-button admin-primary-button--full" disabled={isPending} type="submit">
        {isPending ? 'Signing in...' : 'Login'}
      </button>
    </form>
  );
}
