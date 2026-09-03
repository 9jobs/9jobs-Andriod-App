'use client';

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { agreementInputSchema } from '@/lib/agreements/schema';
import { useToast } from '@/components/admin/ToastProvider';

function getWeekdayName(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 'Monday';
  }

  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
}

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
  packageName: 'Weekly Plan',
  servicePrice: '',
  weeklyJobTarget: '100+',
  initialTerm: '1',
  paymentDay: getWeekdayName(new Date().toISOString().slice(0, 10)),
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
    title: 'Agreement Details',
    fields: ['agreementDate', 'packageName', 'servicePrice', 'weeklyJobTarget', 'paymentDay'],
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
  packageName: 'Package Name',
  servicePrice: 'Service Price',
  weeklyJobTarget: 'Weekly Job Target',
  paymentDay: 'Payment Due Day (e.g. Monday)',
};

const lockedFields = new Set(['providerEmail', 'providerPhone', 'providerAbn', 'packageName', 'weeklyJobTarget', 'paymentDay']);
const providerNameOptions = ['Aditya', 'Addy', 'Jay'];

function buildFormValues(initialValues) {
  return {
    ...initialState,
    ...initialValues,
    providerName: initialValues?.providerName || initialState.providerName,
    providerEmail: initialState.providerEmail,
    providerPhone: initialState.providerPhone,
    providerAbn: initialState.providerAbn,
    packageName: initialState.packageName,
    weeklyJobTarget: initialState.weeklyJobTarget,
    initialTerm: initialState.initialTerm,
    paymentDay: getWeekdayName(initialValues?.agreementDate || initialState.agreementDate),
    notes: '',
  };
}

function getInputType(field) {
  if (field.includes('Email')) return 'email';
  if (field.includes('Date')) return 'date';
  return 'text';
}

export default function AgreementForm({ initialValues = null, agreementId = '', mode = 'create' }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [values, setValues] = useState(initialValues ? buildFormValues(initialValues) : initialState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isPending, setIsPending] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === 'providerName' ? { providerSignatureName: value } : {}),
      ...(field === 'agreementDate' ? { paymentDay: getWeekdayName(value) } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = agreementInputSchema.safeParse({
      ...values,
      providerName: values.providerName,
      providerEmail: initialState.providerEmail,
      providerPhone: initialState.providerPhone,
      providerSignatureName: values.providerSignatureName,
      providerAbn: initialState.providerAbn,
      packageName: initialState.packageName,
      weeklyJobTarget: initialState.weeklyJobTarget,
      initialTerm: initialState.initialTerm,
      paymentDay: getWeekdayName(values.agreementDate),
      notes: '',
    });

    if (!validation.success) {
      const nextErrors = {};

      validation.error.issues.forEach((issue) => {
        nextErrors[issue.path[0]] = issue.message;
      });

      setFieldErrors(nextErrors);
      pushToast({ title: 'Please fix the highlighted agreement fields.', tone: 'error' });
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    try {
      const response = await fetch('/admin/website-admin/api/agreements', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mode === 'edit' ? { id: agreementId, ...validation.data } : validation.data),
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || `Unable to ${mode === 'edit' ? 'update' : 'create'} agreement.`, tone: 'error' });
        return;
      }

      pushToast({ title: mode === 'edit' ? 'Agreement updated.' : 'Agreement created.', tone: 'success' });
      startTransition(() => {
        router.push(`/admin/website-admin/agreements/${data.agreement._id}`);
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className="admin-form"
      onSubmit={handleSubmit}
    >
      <input name="initialTerm" type="hidden" value={values.initialTerm} />
      <input name="notes" type="hidden" value={values.notes} />
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header admin-panel__header--stack">
          <div>
            <h2>Agreement Workspace</h2>
            <p>Fill the details once. We generate the same PDF for preview and DocuSign delivery.</p>
          </div>
        </div>
        <div className="admin-chip-row">
          <span className="admin-chip">Blank form</span>
          <span className="admin-chip">Instant PDF preview</span>
          <span className="admin-chip">DocuSign ready</span>
        </div>
      </section>

      {sections.map((section) => (
        <section className="admin-panel" key={section.title}>
          <h2>{section.title}</h2>
          <div className="admin-form-grid">
    {section.fields.map((field) => (
              <label className={`admin-field ${field === 'notes' ? 'admin-field--full' : ''}`} key={field}>
                <span>{labels[field]}</span>
                {field === 'notes' ? (
                  <textarea
                    onChange={(event) => updateField(field, event.target.value)}
                    rows={5}
                    value={values[field]}
                  />
                ) : field === 'providerName' ? (
                  <select name={field} onChange={(event) => updateField(field, event.target.value)} value={values[field]}>
                    {providerNameOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field}
                    readOnly={lockedFields.has(field)}
                    onChange={(event) => updateField(field, event.target.value)}
                    type={getInputType(field)}
                    value={values[field]}
                  />
                )}
                {fieldErrors[field] ? <small className="admin-error-text">{fieldErrors[field]}</small> : null}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="admin-form-actions">
        <button className="admin-primary-button" disabled={isPending} type="submit">
          {isPending ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Agreement' : 'Create Agreement')}
        </button>
      </div>
    </form>
  );
}
