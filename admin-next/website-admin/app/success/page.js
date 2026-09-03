"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const billingType = searchParams.get("billing");
  const invoiceId = searchParams.get("invoice");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !invoiceId) {
      return;
    }

    const isFortnightInvoice =
      billingType === 'fortnight-monthly' ||
      billingType === 'fortnight-upfront';

    const encodedSessionId = encodeURIComponent(sessionId);
    const invoicePath = isFortnightInvoice
      ? `/admin/website-admin/api/fortnight-invoices/${invoiceId}/download-after-payment?session_id=${encodedSessionId}`
      : `/admin/website-admin/api/invoices/${invoiceId}/download-after-payment?session_id=${encodedSessionId}`;
    const slipPath = isFortnightInvoice
      ? `/admin/website-admin/api/fortnight-invoices/${invoiceId}/payment-slip?session_id=${encodedSessionId}`
      : `/admin/website-admin/api/invoices/${invoiceId}/payment-slip?session_id=${encodedSessionId}`;

    const triggerDownload = (href) => {
      const link = document.createElement('a');
      link.href = href;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    triggerDownload(slipPath);
    const timer = window.setTimeout(() => {
      triggerDownload(invoicePath);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [billingType, invoiceId, sessionId]);

  if (loading) {
    return (
      <div
        style={{
          width: 'min(420px, calc(100vw - 32px))',
          borderRadius: '28px',
          background: '#2f2f2f',
          color: '#fff',
          padding: '40px 28px',
          boxShadow: '0 28px 60px rgba(0, 0, 0, 0.28)',
        }}
      >
        <p style={{ margin: 0, fontSize: '1rem', opacity: 0.86 }}>Verifying payment...</p>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
      style={{
        width: 'min(420px, calc(100vw - 32px))',
        borderRadius: '28px',
        background: '#2f2f2f',
        color: '#fff',
        padding: '40px 28px 32px',
        boxShadow: '0 28px 60px rgba(0, 0, 0, 0.28)',
      }}
    >
      <div
        style={{
          width: '92px',
          height: '92px',
          margin: '0 auto 22px',
          borderRadius: '999px',
          background: 'linear-gradient(180deg, #58dd6d 0%, #39bf50 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(73, 218, 128, 0.32)',
        }}
      >
        <CheckCircle size={52} color="#fff" strokeWidth={2.6} />
      </div>
      <h1
        id="payment-success-title"
        style={{
          fontSize: '2.2rem',
          lineHeight: 1.1,
          marginBottom: '14px',
          fontWeight: 800,
          color: '#fff',
        }}
      >
        Payment Successful!
      </h1>
      <p
        style={{
          fontSize: '1rem',
          lineHeight: 1.7,
          color: 'rgba(255, 255, 255, 0.78)',
          maxWidth: '320px',
          margin: '0 auto 28px',
        }}
      >
        {billingType === 'weekly'
          ? "Thank you. Your first weekly payment has been submitted and your recurring subscription will be confirmed from Stripe webhook verification."
          : "Thank you for your purchase. Your plan has been activated. We've sent a confirmation email to your registered address."}
      </p>
      <Link
        href="/"
        className="fj-button fj-button--dark"
        style={{
          minWidth: '220px',
          justifyContent: 'center',
          borderRadius: '14px',
          background: '#52c85b',
          color: '#fff',
          border: 'none',
          boxShadow: '0 10px 24px rgba(82, 200, 91, 0.24)',
        }}
      >
        Go to Dashboard <ArrowRight size={17} style={{ marginLeft: '8px' }} />
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main
      className="fj-page"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        padding: '24px 16px',
        background: 'radial-gradient(circle at top, rgba(82, 200, 91, 0.16), transparent 32%), rgba(15, 15, 15, 0.26)',
      }}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
