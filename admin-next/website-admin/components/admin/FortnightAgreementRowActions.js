'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function FortnightAgreementRowActions({ agreementId, status }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this contract?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/admin/website-admin/api/fortnight-agreements?id=${agreementId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || 'Unable to delete contract.', tone: 'error' });
        return;
      }

      pushToast({ title: 'Contract deleted.', tone: 'success' });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="admin-actions-row">
      <Link className="admin-link admin-link--view" href={`/admin/website-admin/fortnight-agreements/${agreementId}`}>
        View
      </Link>
      {status !== 'completed' ? (
        <Link className="admin-link" href={`/admin/website-admin/fortnight-agreements/${agreementId}/edit`}>
          Edit
        </Link>
      ) : null}
      <button className="admin-link" disabled={isDeleting} onClick={handleDelete} type="button">
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
