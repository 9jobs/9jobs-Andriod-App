'use client';

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { fortnightAgreementInputSchema } from '@/lib/fortnight-agreements/schema';
import { useToast } from '@/components/admin/ToastProvider';

const initialState = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  providerName: 'Aditya',
  providerEmail: '9jobsapplicationservice@gmail.com',
  providerPhone: '+61 422 279 428',
  providerSignatureName: 'Aditya Singh',
  providerAbn: '83679842972',
  agreementDate: new Date().toISOString().slice(0, 10),
  servicePrice: 'AUD $200', // Upfront Service Fee
  initialTerm: '2 month', // Service Period
  renewalEnabled: false,
  renewalTerm: '1 month',
  renewalFee: 'AUD $90',
  notes: '',
};

const sections = [
  {
    title: 'Client Details',
    fields: ['clientName', 'clientEmail', 'clientPhone'],
  },
  {
    title: 'Service Provider Details',
    fields: ['providerName', 'providerEmail', 'providerPhone', 'providerSignatureName', 'providerAbn'],
  },
  {
    title: 'Agreement Parameters',
    fields: ['agreementDate', 'initialTerm', 'servicePrice', 'renewalEnabled', 'renewalTerm', 'renewalFee'],
  },
];

const labels = {
  clientName: 'Client Name',
  clientEmail: 'Client Email',
  clientPhone: 'Client Phone',
  providerName: 'Provider Name',
  providerEmail: 'Provider Email',
  providerPhone: 'Provider Phone',
  providerSignatureName: 'Provider Signature Name',
  providerAbn: 'Provider ABN',
  agreementDate: 'Agreement Date',
  initialTerm: '2. Service Period',
  servicePrice: '3. Upfront Service Fee (e.g. AUD $200)',
  renewalEnabled: 'Renewal',
  renewalTerm: 'Renewal Month',
  renewalFee: 'Renewal Fee',
};

const lockedFields = new Set(['providerEmail', 'providerPhone', 'providerAbn']);
const providerNameOptions = ['Aditya', 'Addy', 'Jay'];
const servicePeriodOptions = ['1 month', '2 month'];
const renewalTermOptions = ['1 month', '2 month'];

function normalizeServicePeriod(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized.includes('1 month') || normalized.includes('one (1)')) {
    return '1 month';
  }

  return '2 month';
}

function buildFormValues(initialValues) {
  return {
    ...initialState,
    ...initialValues,
    providerName: initialState.providerName,
    providerEmail: initialState.providerEmail,
    providerPhone: initialState.providerPhone,
    providerAbn: initialState.providerAbn,
    initialTerm: normalizeServicePeriod(initialValues?.initialTerm),
    renewalEnabled: Boolean(initialValues?.renewalEnabled),
    renewalTerm: normalizeServicePeriod(initialValues?.renewalTerm || initialState.renewalTerm),
    renewalFee: initialValues?.renewalFee || initialState.renewalFee,
    notes: '',
  };
}

function getInputType(field) {
  if (field.includes('Email')) return 'email';
  if (field.includes('Date')) return 'date';
  return 'text';
}

export default function FortnightAgreementForm({ initialValues = null, agreementId = '', mode = 'create' }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [values, setValues] = useState(initialValues ? buildFormValues(initialValues) : initialState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isPending, setIsPending] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function shouldShowField(field) {
    if (field === 'renewalTerm' || field === 'renewalFee') {
      return values.renewalEnabled;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isPending) return;
    const validation = fortnightAgreementInputSchema.safeParse(values);

    if (!validation.success) {
      const nextErrors = {};

      validation.error.issues.forEach((issue) => {
        nextErrors[issue.path[0]] = issue.message;
      });

      setFieldErrors(nextErrors);
      pushToast({ title: 'Please fix the highlighted fields.', tone: 'error' });
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    try {
      const response = await fetch('/admin/website-admin/api/fortnight-agreements', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mode === 'edit' ? { id: agreementId, ...validation.data, notes: '' } : { ...validation.data, notes: '' }),
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || `Unable to ${mode === 'edit' ? 'update' : 'create'} contract.`, tone: 'error' });
        return;
      }

      pushToast({ title: mode === 'edit' ? 'Contract updated.' : 'Contract created.', tone: 'success' });
      startTransition(() => {
        router.push(`/admin/website-admin/fortnight-agreements/${data.agreement._id}`);
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header admin-panel__header--stack">
          <div>
            <h2>Fortnight Agreement Workspace</h2>
            <p>Fill the details once. We generate the same PDF for preview and signing.</p>
          </div>
        </div>
        <div className="admin-chip-row">
          <span className="admin-chip">1 or 2 month period</span>
          <span className="admin-chip">Custom Upfront Fee</span>
          <span className="admin-chip">On-Site E-Sign Ready</span>
        </div>
      </section>

      {sections.map((section) => (
        <section className="admin-panel" key={section.title}>
          <h2>{section.title}</h2>
          <div className="admin-form-grid">
            {section.fields.map((field) => (
              shouldShowField(field) ? (
              <label className={`admin-field ${field === 'notes' ? 'admin-field--full' : ''}`} key={field}>
                <span>{labels[field]}</span>
                {field === 'initialTerm' || field === 'renewalTerm' ? (
                  <select onChange={(event) => updateField(field, event.target.value)} value={values[field]}>
                    {(field === 'initialTerm' ? servicePeriodOptions : renewalTermOptions).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field === 'providerName' ? (
                  <select onChange={(event) => updateField(field, event.target.value)} value={values[field]}>
                    {providerNameOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field === 'renewalEnabled' ? (
                  <div className="admin-toggle-group" role="group" aria-label="Renewal toggle">
                    <button
                      className={!values.renewalEnabled ? 'admin-toggle-button admin-toggle-button--active' : 'admin-toggle-button'}
                      onClick={() => updateField(field, false)}
                      type="button"
                    >
                      Off
                    </button>
                    <button
                      className={values.renewalEnabled ? 'admin-toggle-button admin-toggle-button--active' : 'admin-toggle-button'}
                      onClick={() => updateField(field, true)}
                      type="button"
                    >
                      On
                    </button>
                  </div>
                ) : (
                  <input
                    readOnly={lockedFields.has(field)}
                    onChange={(event) => updateField(field, event.target.value)}
                    type={getInputType(field)}
                    value={values[field]}
                  />
                )}
                {fieldErrors[field] ? <small className="admin-error-text">{fieldErrors[field]}</small> : null}
              </label>
              ) : null
            ))}
          </div>
        </section>
      ))}

      <div className="admin-form-actions">
        <button className="admin-primary-button" disabled={isPending} type="submit">
          {isPending ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Contract' : 'Create Contract')}
        </button>
      </div>
    </form>
  );
}
