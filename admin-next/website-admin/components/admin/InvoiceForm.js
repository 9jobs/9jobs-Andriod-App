'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/admin/ToastProvider';
import { invoiceInputSchema } from '@/lib/invoices/schema';

const initialState = {
  invoiceNumber: '9J-202607-017',
  invoiceDate: '2026-07-01',
  billedToName: '',
  billedToEmail: '',
  billedToPhone: '',
  weekLabel: '1',
  issuedDate: '2026-07-01',
  validUntil: '2026-07-07',
  dueDate: '2026-07-02',
  description: '',
  duration: '1 WEEK',
  total: '150',
};

const sections = [
  {
    title: 'Invoice Header',
    fields: ['invoiceNumber', 'invoiceDate'],
  },
  {
    title: 'Billed To',
    fields: ['billedToName', 'billedToEmail', 'billedToPhone'],
  },
  {
    title: 'Invoice Details',
    fields: ['weekLabel', 'issuedDate', 'validUntil', 'dueDate', 'description', 'duration', 'total'],
  },
];

const labels = {
  invoiceNumber: 'Invoice Number',
  invoiceDate: 'Invoice Date',
  billedToName: 'Billed To Name',
  billedToEmail: 'Billed To Email',
  billedToPhone: 'Billed To Phone',
  weekLabel: 'Week',
  issuedDate: 'Issued Date',
  validUntil: 'Valid Until',
  dueDate: 'Due Date',
  description: 'Description',
  duration: 'Duration',
  total: 'Total (AUD)',
};

const placeholders = {
  description: 'Enter any invoice description',
};

function getInputType(field) {
  if (field.toLowerCase().includes('email')) return 'email';
  if (field.toLowerCase().includes('date') || field === 'validUntil') return 'date';
  return 'text';
}

export default function InvoiceForm({ initialValues = null, invoiceId = '', mode = 'create' }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [values, setValues] = useState(initialValues || initialState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isPending, setIsPending] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = invoiceInputSchema.safeParse(values);

    if (!validation.success) {
      const nextErrors = {};

      validation.error.issues.forEach((issue) => {
        nextErrors[issue.path[0]] = issue.message;
      });

      setFieldErrors(nextErrors);
      pushToast({ title: 'Please fix the highlighted invoice fields.', tone: 'error' });
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    try {
      const response = await fetch('/admin/website-admin/api/invoices', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mode === 'edit' ? { id: invoiceId, ...validation.data } : validation.data),
      });
      const data = await response.json();

      if (!response.ok) {
        pushToast({ title: data.error || `Unable to ${mode === 'edit' ? 'update' : 'create'} invoice.`, tone: 'error' });
        return;
      }

      pushToast({ title: mode === 'edit' ? 'Invoice updated.' : 'Invoice created.', tone: 'success' });
      startTransition(() => {
        router.push(`/admin/website-admin/invoices/${data.invoice._id}`);
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
            <h2>Invoice Workspace</h2>
            <p>Edit only the required invoice fields, generate the branded PDF and send it by email.</p>
          </div>
        </div>
        <div className="admin-chip-row">
          <span className="admin-chip">9Jobs logo</span>
          <span className="admin-chip">PDF attachment</span>
          <span className="admin-chip">Email delivery</span>
        </div>
        <p>Payment details are locked to the 9Jobs account profile and will be filled automatically in the PDF.</p>
      </section>

      {sections.map((section) => (
               <section className="admin-panel" key={section.title}>
          <h2>{section.title}</h2>
          <div className="admin-form-grid">
            {section.fields.map((field) => (
               <label className="admin-field" key={field}>
                <span>{labels[field]}</span>
                <input
                  onChange={(event) => updateField(field, event.target.value)}
                  placeholder={placeholders[field] || ''}
                  type={getInputType(field)}
                  value={values[field]}
                />
                {fieldErrors[field] ? <small className="admin-error-text">{fieldErrors[field]}</small> : null}
               </label>
 ))}
               </div>
        </section>
 ))}

               <div className="admin-form-actions">
        <button className="admin-primary-button" disabled={isPending} type="submit">
          {isPending ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Invoice' : 'Create Invoice')}
        </button>
      </div>
    </form>
  );
}