'use client';

import Link from 'next/link';
import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function FortnightAgreementActions({ agreementId, status, hasGeneratedPdf, hasSignedPdf, isCompleted }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState('');

  async function runAction(action, url) {
    if (pendingAction) return;
    setPendingAction(action);

    try {
      const response = await fetch(url, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || `Unable to ${action}.`, tone: 'error' });
        return;
      }

      pushToast({
        title: action === 'generate' ? 'Contract preview generated.' : 'Contract sent to client.',
        tone: 'success',
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction('');
    }
  }

  return (
    <div className="admin-actions-row">
      <button
        className="admin-primary-button"
        disabled={pendingAction === 'generate'}
        onClick={() => runAction('generate', `/admin/website-admin/api/fortnight-agreements/${agreementId}/generate-pdf`)}
        type="button"
      >
        {pendingAction === 'generate' ? 'Generating...' : hasGeneratedPdf ? 'Regenerate Preview' : 'Generate Preview'}
      </button>

      <Link className="admin-dark-button admin-dark-button--link" href={`/admin/website-admin/fortnight-agreements/${agreementId}/edit`} prefetch={false}>
        Edit
      </Link>

      <button
        className="admin-dark-button"
        disabled={pendingAction === 'send'}
        onClick={() => runAction('send', `/admin/website-admin/api/fortnight-agreements/${agreementId}/send`)}
        type="button"
      >
        {pendingAction === 'send' ? 'Sending...' : 'Send Contract'}
      </button>

      {hasSignedPdf ? (
        <a className="admin-ghost-button admin-ghost-button--link" href={`/admin/website-admin/api/fortnight-agreements/${agreementId}/download`} download>
          Download Signed PDF
        </a>
      ) : null}

      {isCompleted && hasSignedPdf ? (
        <a
          className="admin-ghost-button admin-ghost-button--link"
          href={`/admin/website-admin/api/fortnight-agreements/${agreementId}/preview-pdf?variant=signed`}
          rel="noreferrer"
          target="_blank"
        >
          View Signed PDF
        </a>
      ) : null}
    </div>
  );
}
