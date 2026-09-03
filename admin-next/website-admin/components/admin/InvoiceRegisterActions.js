'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function InvoiceRegisterActions({ invoiceId }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this invoice?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/admin/website-admin/api/invoices?id=${invoiceId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || 'Unable to delete invoice.', tone: 'error' });
        return;
      }

      pushToast({ title: 'Invoice deleted.', tone: 'success' });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="admin-actions-row">
      <Link className="admin-link admin-link--view" href={`/admin/website-admin/invoices/${invoiceId}`}>
 View
               </Link>
      <Link className="admin-link" href={`/admin/website-admin/invoices/${invoiceId}/edit`}>
 Edit
               </Link>
      <button className="admin-link" disabled={isDeleting} onClick={handleDelete} type="button">
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
