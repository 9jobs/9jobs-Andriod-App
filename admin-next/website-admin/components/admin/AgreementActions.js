'use client';

import Link from 'next/link';
import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function AgreementActions({ agreementId, hasGeneratedPdf, hasSignedPdf, isCompleted }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState('');

  async function runAction(action, url) {
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

      if (action === 'whatsapp' && data.whatsappShareUrl) {
        window.open(data.whatsappShareUrl, '_blank', 'noopener,noreferrer');
      }

      pushToast({
        title:
          action === 'generate'
            ? 'Agreement preview generated.'
            : action === 'whatsapp'
              ? 'WhatsApp share is ready.'
              : 'Agreement sent.',
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
        onClick={() => runAction('generate', `/admin/website-admin/api/agreements/${agreementId}/generate-pdf`)}
        type="button"
      >
        {pendingAction === 'generate' ? 'Generating...' : hasGeneratedPdf ? 'Regenerate Preview' : 'Generate Preview'}
      </button>

      <Link className="admin-dark-button admin-dark-button--link" href={`/admin/website-admin/agreements/${agreementId}/edit`} prefetch={false}>
        Edit
      </Link>

      <button
        className="admin-dark-button"
        disabled={pendingAction === 'send'}
        onClick={() => runAction('send', `/admin/website-admin/api/docusign/send/${agreementId}`)}
        type="button"
      >
        {pendingAction === 'send' ? 'Sending...' : 'Send Agreement'}
      </button>

      <button
        className="admin-dark-button"
        disabled={pendingAction === 'whatsapp'}
        onClick={() => runAction('whatsapp', `/admin/website-admin/api/agreements/${agreementId}/send-whatsapp`)}
        type="button"
      >
        {pendingAction === 'whatsapp' ? 'Opening...' : 'Send by WhatsApp'}
      </button>

      {hasSignedPdf ? (
        <a className="admin-ghost-button admin-ghost-button--link" href={`/admin/website-admin/api/docusign/download/${agreementId}`}>
          Download Signed PDF
        </a>
      ) : null}

      {isCompleted && hasSignedPdf ? (
        <a
          className="admin-ghost-button admin-ghost-button--link"
          href={`/admin/website-admin/api/agreements/${agreementId}/preview-pdf?variant=signed`}
          rel="noreferrer"
          target="_blank"
        >
          View Signed PDF
        </a>
      ) : null}
    </div>
  );
}
