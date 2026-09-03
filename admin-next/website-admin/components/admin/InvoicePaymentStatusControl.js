'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function InvoicePaymentStatusControl({
  invoiceId,
  routeType,
  initialStatus = 'pending',
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(event) {
    const nextStatus = event.target.value;
    const previousStatus = paymentStatus;

    setPaymentStatus(nextStatus);
    setIsSaving(true);

    try {
      const basePath = routeType === 'weekly' ? '/admin/website-admin/api/invoices' : '/admin/website-admin/api/fortnight-invoices';
      const response = await fetch(`${basePath}/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPaymentStatus(previousStatus);
        pushToast({ title: data.error || 'Unable to update invoice status.', tone: 'error' });
        return;
      }

      pushToast({ title: `Invoice marked ${nextStatus}.`, tone: 'success' });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setPaymentStatus(previousStatus);
      pushToast({ title: error.message || 'Unable to update invoice status.', tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <label style={{ display: 'inline-block' }}>
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Invoice payment status
      </span>
      <select
        disabled={isSaving}
        onChange={handleChange}
        style={{
          minWidth: '112px',
          padding: '8px 12px',
          borderRadius: '999px',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          background: '#fff',
          color: paymentStatus === 'paid' ? '#15803d' : '#b45309',
          fontSize: '0.82rem',
          fontWeight: 700,
        }}
        value={paymentStatus}
      >
        <option value="paid">Paid</option>
        <option value="pending">Pending</option>
      </select>
    </label>
  );
}
