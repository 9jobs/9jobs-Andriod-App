'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

export default function InvoiceActions({
  invoiceId,
  hasGeneratedPdf,
  initialCheckoutUrl = '',
  initialPaymentStatus = 'pending',
  initialPaymentLinkSentAt = '',
  initialStripeSubscriptionId = '',
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(initialCheckoutUrl);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [paymentLinkSentAt, setPaymentLinkSentAt] = useState(initialPaymentLinkSentAt);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState(initialStripeSubscriptionId);
  const [copied, setCopied] = useState(false);

  async function copyPaymentLink() {
    if (!checkoutUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      pushToast({ title: 'Payment link copied.', tone: 'success' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast({ title: 'Unable to copy payment link.', tone: 'error' });
    }
  }

  async function runAction(action, url, options = {}) {
    setPendingAction(action);

    try {
      const response = await fetch(url, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || `Unable to ${action} invoice.`, tone: 'error' });
        return;
      }

      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
      }

      if (action === 'paymentLink' || action === 'emailLink') {
        setPaymentStatus(data.invoice?.paymentStatus || 'pending');
        setStripeSubscriptionId(data.invoice?.stripeSubscriptionId || '');
      }

      if (action === 'emailLink') {
        const sentAt = data.invoice?.paymentLinkSentAt || new Date().toISOString();
        setPaymentLinkSentAt(sentAt);
      }

      if (options.onSuccess) {
        options.onSuccess(data);
      }

      const toastTitleByAction = {
        generate: 'Invoice preview generated.',
        send: 'Invoice sent by email.',
        paymentLink: 'Payment link generated.',
        emailLink: 'Payment link sent by email.',
        whatsapp: 'WhatsApp share link is ready.',
      };

      pushToast({
        title: toastTitleByAction[action] || 'Invoice action completed.',
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
        onClick={() => runAction('generate', `/admin/website-admin/api/invoices/${invoiceId}/generate-pdf`)}
        type="button"
      >
        {pendingAction === 'generate' ? 'Generating...' : hasGeneratedPdf ? 'Regenerate Preview' : 'Generate Preview'}
      </button>
      <Link className="admin-dark-button admin-dark-button--link" href={`/admin/website-admin/invoices/${invoiceId}/edit`} prefetch={false}>
        Edit
      </Link>
      <button
        className="admin-dark-button"
        disabled={pendingAction === 'paymentLink'}
        onClick={() => runAction('paymentLink', `/admin/website-admin/api/invoices/${invoiceId}/payment-link`)}
        type="button"
      >
        {pendingAction === 'paymentLink' ? 'Generating...' : 'Generate Payment Link'}
      </button>
      <button
        className="admin-dark-button"
        disabled={pendingAction === 'emailLink'}
        onClick={() => runAction('emailLink', `/admin/website-admin/api/invoices/${invoiceId}/send-payment-link`)}
        type="button"
      >
        {pendingAction === 'emailLink' ? 'Sending...' : 'Send via Email'}
      </button>
      <button
        className="admin-dark-button"
        disabled={pendingAction === 'send'}
        onClick={() => runAction('send', `/admin/website-admin/api/invoices/send/${invoiceId}`)}
        type="button"
      >
        {pendingAction === 'send' ? 'Sending...' : 'Send Invoice'}
      </button>
      <button
        className="admin-dark-button"
        disabled={pendingAction === 'whatsapp'}
        onClick={() =>
          runAction('whatsapp', `/admin/website-admin/api/invoices/${invoiceId}/payment-link`, {
            onSuccess: (data) => {
              if (data.whatsappShareUrl) {
                window.open(data.whatsappShareUrl, '_blank', 'noopener,noreferrer');
              }
            },
          })
        }
        type="button"
      >
        {pendingAction === 'whatsapp' ? 'Opening...' : 'Share by WhatsApp'}
      </button>

      {checkoutUrl ? (
        <section className="admin-panel admin-payment-link-panel" aria-labelledby={`invoice-payment-link-${invoiceId}`}>
          <div className="admin-panel__header admin-panel__header--compact">
            <div>
              <h2 id={`invoice-payment-link-${invoiceId}`}>Payment Link</h2>
            </div>
          </div>

          <div className="admin-payment-link-panel__box">
            <a
              className="admin-payment-link-panel__anchor"
              href={checkoutUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open Payment Link
            </a>
          </div>

          <div className="admin-payment-link-panel__actions">
            <button className="admin-secondary-button" onClick={copyPaymentLink} type="button">
              {copied ? 'Copied' : 'Copy Link'}
            </button>
            <button
              className="admin-secondary-button"
              onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}
              type="button"
            >
              Open Link
            </button>
            <button
              className="admin-secondary-button"
              disabled={pendingAction === 'emailLink'}
              onClick={() => runAction('emailLink', `/admin/website-admin/api/invoices/${invoiceId}/send-payment-link`)}
              type="button"
            >
              {pendingAction === 'emailLink' ? 'Sending...' : 'Send via Email'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
