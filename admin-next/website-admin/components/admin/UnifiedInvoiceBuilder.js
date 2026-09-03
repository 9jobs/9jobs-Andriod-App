'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';

function addDays(input, days) {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function addMonths(input, months) {
  const date = new Date(input);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

function normalizeAmount(value) {
  return String(value || '')
    .replace(/[^0-9.]/g, '')
    .replace(/^0+(?=\d)/, '');
}

function getFortnightTermLabel(term) {
  if (term === 'week') {
    return '1 week';
  }

  return `${term} month`;
}

export default function UnifiedInvoiceBuilder({
  weeklyDefaults,
  fortnightDefaults,
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [invoiceType, setInvoiceType] = useState('weekly');
  const [billedToName, setBilledToName] = useState('');
  const [billedToEmail, setBilledToEmail] = useState('');
  const [billedToPhone, setBilledToPhone] = useState('');
  const [amount, setAmount] = useState('200');
  const [weeklyAutopay, setWeeklyAutopay] = useState(true);
  const [fortnightTerm, setFortnightTerm] = useState('1');
  const [fortnightAutopay, setFortnightAutopay] = useState(true);
  const [weeklyInvoiceNumber, setWeeklyInvoiceNumber] = useState(weeklyDefaults.invoiceNumber);
  const [weeklyInvoiceDate, setWeeklyInvoiceDate] = useState(weeklyDefaults.invoiceDate);
  const [weeklyIssuedDate, setWeeklyIssuedDate] = useState(weeklyDefaults.issuedDate);
  const [weeklyValidUntil, setWeeklyValidUntil] = useState(addDays(weeklyDefaults.issuedDate, 7));
  const [weeklyDueDate, setWeeklyDueDate] = useState(addDays(weeklyDefaults.issuedDate, 1));
  const [fortnightInvoiceNumber, setFortnightInvoiceNumber] = useState(fortnightDefaults.invoiceNumber);
  const [fortnightInvoiceDate, setFortnightInvoiceDate] = useState(fortnightDefaults.invoiceDate);
  const [fortnightIssuedDate, setFortnightIssuedDate] = useState(fortnightDefaults.issuedDate);
  const [fortnightValidUntil, setFortnightValidUntil] = useState(addMonths(fortnightDefaults.issuedDate, 1));
  const [fortnightDueDate, setFortnightDueDate] = useState(addDays(fortnightDefaults.issuedDate, 1));
  const [isSubmitting, setIsSubmitting] = useState(false);

  let helperCopy = 'Onboarding fees are always one-time only. No autopay will be activated.';

  if (invoiceType === 'weekly') {
    helperCopy = weeklyAutopay
      ? 'Weekly plan with autopay on. First payment is paid now, then Stripe will continue recurring weekly billing.'
      : 'Weekly plan with autopay off. Client pays this invoice one time only.';
  } else if (invoiceType === 'fortnight') {
    helperCopy = fortnightAutopay
      ? `Fortnight plan for ${getFortnightTermLabel(fortnightTerm)} with autopay on. First payment activates recurring billing.`
      : `Fortnight plan for ${getFortnightTermLabel(fortnightTerm)} with autopay off. Client pays this invoice one time only.`;
  }

  const invoiceMeta = invoiceType === 'weekly'
    ? {
        invoiceNumber: weeklyInvoiceNumber,
        invoiceDate: weeklyInvoiceDate,
        issuedDate: weeklyIssuedDate,
        validUntil: weeklyValidUntil,
        dueDate: weeklyDueDate,
      }
    : {
        invoiceNumber: fortnightInvoiceNumber,
        invoiceDate: fortnightInvoiceDate,
        issuedDate: fortnightIssuedDate,
        validUntil: fortnightValidUntil,
        dueDate: fortnightDueDate,
      };

  function closeBuilder() {
    startTransition(() => {
      router.push('/admin/website-admin/invoices');
      router.refresh();
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!billedToName.trim() || !billedToEmail.trim() || !billedToPhone.trim() || !normalizeAmount(amount)) {
      pushToast({ title: 'Please fill client name, email, phone, and amount.', tone: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      let endpoint = '/admin/website-admin/api/invoices';
      let nextDetailPath = '';
      let payload = null;

      if (invoiceType === 'weekly') {
        const weeklyDescription = weeklyAutopay ? 'Weekly Plan' : 'Weekly Plan';
        payload = {
          ...weeklyDefaults,
          invoiceNumber: weeklyInvoiceNumber,
          invoiceDate: weeklyInvoiceDate,
          issuedDate: weeklyIssuedDate,
          validUntil: weeklyValidUntil,
          dueDate: weeklyDueDate,
          billedToName: billedToName.trim(),
          billedToEmail: billedToEmail.trim(),
          billedToPhone: billedToPhone.trim(),
          weekLabel: '1',
          description: weeklyDescription,
          duration: weeklyAutopay ? '1 WEEK' : 'ONE TIME PAYMENT',
          total: normalizeAmount(amount),
        };
      } else {
        endpoint = '/admin/website-admin/api/fortnight-invoices';
        const months = Number(fortnightTerm);
        const isWeekTerm = fortnightTerm === 'week';
        const description =
          invoiceType === 'onboarding'
            ? 'Onboarding Fees'
            : 'Fortnight Plan';

        payload = {
          ...fortnightDefaults,
          invoiceNumber: fortnightInvoiceNumber,
          invoiceDate: fortnightInvoiceDate,
          issuedDate: fortnightIssuedDate,
          validUntil: fortnightValidUntil,
          dueDate: fortnightDueDate,
          billedToName: billedToName.trim(),
          billedToEmail: billedToEmail.trim(),
          billedToPhone: billedToPhone.trim(),
          monthLabel: invoiceType === 'onboarding' ? '0' : isWeekTerm ? 'Week' : fortnightTerm,
          description,
          duration:
            invoiceType === 'onboarding'
              ? 'UPFRONT FEES'
              : isWeekTerm
                ? fortnightAutopay
                  ? '1 WEEK'
                  : 'ONE TIME PAYMENT'
              : fortnightAutopay
                ? `${fortnightTerm} ${months === 1 ? 'MONTH' : 'MONTHS'}`
                : 'ONE TIME PAYMENT',
          total: normalizeAmount(amount),
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || 'Unable to create invoice.', tone: 'error' });
        return;
      }

      nextDetailPath =
        invoiceType === 'weekly'
          ? `/admin/website-admin/invoices/${data.invoice._id}`
          : `/admin/website-admin/fortnight-invoices/${data.invoice._id}`;

      pushToast({ title: 'Invoice created successfully.', tone: 'success' });
      startTransition(() => {
        router.push(nextDetailPath);
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="admin-panel admin-panel--builder-inline">
        <div className="admin-panel__header admin-panel__header--compact admin-panel__header--inline-builder">
          <div>
            <h2 id="invoice-builder-title">Create Invoice</h2>
            <p>Select the invoice type, amount, and autopay option from one place.</p>
          </div>
        </div>

        <form className="admin-form admin-form--compact" onSubmit={handleSubmit}>
          <section className="admin-panel admin-panel--compact" style={{ marginTop: '6px' }}>
            <h3 className="admin-section-title">1. Which invoice do you want to send?</h3>
            <div className="admin-chip-row">
              <button
                className={invoiceType === 'weekly' ? 'admin-primary-button' : 'admin-ghost-button'}
                onClick={() => setInvoiceType('weekly')}
                type="button"
              >
                Weekly
              </button>
              <button
                className={invoiceType === 'fortnight' ? 'admin-primary-button' : 'admin-ghost-button'}
                onClick={() => setInvoiceType('fortnight')}
                type="button"
              >
                Fortnight
              </button>
              <button
                className={invoiceType === 'onboarding' ? 'admin-primary-button' : 'admin-ghost-button'}
                onClick={() => setInvoiceType('onboarding')}
                type="button"
              >
                Onboarding Fees
              </button>
            </div>
          </section>

          <section className="admin-panel admin-panel--compact">
            <h3 className="admin-section-title">2. Invoice details</h3>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Invoice Number</span>
                <input
                  onChange={(event) => invoiceType === 'weekly'
                    ? setWeeklyInvoiceNumber(event.target.value)
                    : setFortnightInvoiceNumber(event.target.value)}
                  type="text"
                  value={invoiceMeta.invoiceNumber}
                />
              </label>
              <label className="admin-field">
                <span>Invoice Date</span>
                <input
                  onChange={(event) => invoiceType === 'weekly'
                    ? setWeeklyInvoiceDate(event.target.value)
                    : setFortnightInvoiceDate(event.target.value)}
                  type="text"
                  value={invoiceMeta.invoiceDate}
                />
              </label>
              <label className="admin-field">
                <span>Issued Date</span>
                <input
                  onChange={(event) => invoiceType === 'weekly'
                    ? setWeeklyIssuedDate(event.target.value)
                    : setFortnightIssuedDate(event.target.value)}
                  type="text"
                  value={invoiceMeta.issuedDate}
                />
              </label>
              <label className="admin-field">
                <span>Valid Until</span>
                <input
                  onChange={(event) => invoiceType === 'weekly'
                    ? setWeeklyValidUntil(event.target.value)
                    : setFortnightValidUntil(event.target.value)}
                  type="text"
                  value={invoiceMeta.validUntil}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span>Due Date</span>
                <input
                  onChange={(event) => invoiceType === 'weekly'
                    ? setWeeklyDueDate(event.target.value)
                    : setFortnightDueDate(event.target.value)}
                  type="text"
                  value={invoiceMeta.dueDate}
                />
              </label>
            </div>
          </section>

          <section className="admin-panel admin-panel--compact">
            <h3 className="admin-section-title">3. Client details</h3>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Client Name</span>
                <input onChange={(event) => setBilledToName(event.target.value)} type="text" value={billedToName} />
              </label>
              <label className="admin-field">
                <span>Client Email</span>
                <input onChange={(event) => setBilledToEmail(event.target.value)} type="email" value={billedToEmail} />
              </label>
              <label className="admin-field">
                <span>Client Phone</span>
                <input onChange={(event) => setBilledToPhone(event.target.value)} type="text" value={billedToPhone} />
              </label>
              <label className="admin-field">
                <span>Payment Amount (AUD)</span>
                <input onChange={(event) => setAmount(event.target.value)} type="text" value={amount} />
              </label>
            </div>
          </section>

          {invoiceType === 'weekly' ? (
            <section className="admin-panel admin-panel--compact">
              <h3 className="admin-section-title">4. Weekly plan settings</h3>
              <div className="admin-inline-setting">
                <span className="admin-inline-setting__label">Autopay</span>
                <div className="admin-toggle-group" role="group" aria-label="Weekly autopay toggle">
                  <button
                    aria-pressed={!weeklyAutopay}
                    className={!weeklyAutopay ? 'admin-toggle-button admin-toggle-button--active' : 'admin-toggle-button'}
                    onClick={() => setWeeklyAutopay(false)}
                    type="button"
                  >
                    Off
                  </button>
                  <button
                    aria-pressed={weeklyAutopay}
                    className={weeklyAutopay ? 'admin-toggle-button admin-toggle-button--active' : 'admin-toggle-button'}
                    onClick={() => setWeeklyAutopay(true)}
                    type="button"
                  >
                    On
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {invoiceType === 'fortnight' ? (
            <section className="admin-panel admin-panel--compact">
              <h3 className="admin-section-title">4. Fortnight plan settings</h3>
              <div className="admin-chip-row" style={{ marginBottom: '12px' }}>
                <button
                  className={fortnightTerm === 'week' ? 'admin-primary-button' : 'admin-ghost-button'}
                  onClick={() => setFortnightTerm('week')}
                  type="button"
                >
                  Week
                </button>
                <button
                  className={fortnightTerm === '1' ? 'admin-primary-button' : 'admin-ghost-button'}
                  onClick={() => setFortnightTerm('1')}
                  type="button"
                >
                  1 Month
                </button>
                <button
                  className={fortnightTerm === '2' ? 'admin-primary-button' : 'admin-ghost-button'}
                  onClick={() => setFortnightTerm('2')}
                  type="button"
                >
                  2 Month
                </button>
              </div>
              <div className="admin-inline-setting">
                <span className="admin-inline-setting__label">Autopay</span>
                <div className="admin-toggle-group" role="group" aria-label="Fortnight autopay toggle">
                  <button
                    aria-pressed={!fortnightAutopay}
                    className={!fortnightAutopay ? 'admin-toggle-button admin-toggle-button--active' : 'admin-toggle-button'}
                    onClick={() => setFortnightAutopay(false)}
                    type="button"
                  >
                    Off
                  </button>
                  <button
                    aria-pressed={fortnightAutopay}
                    className={fortnightAutopay ? 'admin-toggle-button admin-toggle-button--active' : 'admin-toggle-button'}
                    onClick={() => setFortnightAutopay(true)}
                    type="button"
                  >
                    On
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="admin-panel admin-panel--compact">
            <h3 className="admin-section-title">5. Invoice flow summary</h3>
            <p style={{ color: '#475569', margin: 0 }}>{helperCopy}</p>
          </section>

          <div className="admin-modal-actions admin-modal-actions--compact">
            <button className="admin-primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
            <button className="admin-ghost-button" onClick={closeBuilder} type="button">
              Back to Invoice List
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
