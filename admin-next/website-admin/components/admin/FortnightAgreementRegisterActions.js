'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function FortnightAgreementRegisterActions({ hasAgreements }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear() {
    if (!window.confirm('Remove all old fortnight agreements and start fresh?')) {
      return;
    }

    setIsClearing(true);

    try {
      const response = await fetch('/admin/website-admin/api/fortnight-agreements', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || 'Unable to clear old agreements.', tone: 'error' });
        return;
      }

      pushToast({
        title: data.deletedCount ? `Removed ${data.deletedCount} old contract${data.deletedCount === 1 ? '' : 's'}.` : 'No old contracts were stored.',
        tone: 'success',
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="admin-actions-row">
      <Link className="admin-primary-button" href="/admin/website-admin/fortnight-agreements/new">
        Create Fortnight
      </Link>
      <button
        className="admin-ghost-button"
        disabled={isClearing || !hasAgreements}
        onClick={handleClear}
        type="button"
      >
        {isClearing ? 'Clearing...' : 'Clear Old Data'}
      </button>
    </div>
  );
}
