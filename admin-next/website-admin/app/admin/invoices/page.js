import Link from 'next/link';

import AdminShell from '@/components/admin/AdminShell';
import InvoiceRegisterActions from '@/components/admin/InvoiceRegisterActions';
import FortnightInvoiceRegisterActions from '@/components/admin/FortnightInvoiceRegisterActions';
import InvoicePaymentStatusControl from '@/components/admin/InvoicePaymentStatusControl';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import { listInvoices } from '@/lib/invoices/service';
import { listFortnightInvoices } from '@/lib/fortnight-invoices/service';

export const dynamic = 'force-dynamic';

function isInvoiceCompleted(invoice) {
  return getInvoicePaymentStatus(invoice) === 'paid';
}

function isInvoicePending(invoice) {
  return getInvoicePaymentStatus(invoice) === 'pending';
}

function getInvoicePaymentStatus(invoice) {
  if (invoice.paymentStatus === 'paid' || invoice.status === 'paid') {
    return 'paid';
  }

  return 'pending';
}

function filterInvoicesByMetric(invoices, metric) {
  if (metric === 'completed' || metric === 'revenue') {
    return invoices.filter(isInvoiceCompleted);
  }

  if (metric === 'pending') {
    return invoices.filter(isInvoicePending);
  }

  return invoices;
}

export default async function InvoicesPage({ searchParams }) {
  await requireAdminPageSession();
  const resolvedSearchParams = await searchParams;
  const metric =
    resolvedSearchParams?.metric === 'completed' ||
    resolvedSearchParams?.metric === 'pending' ||
    resolvedSearchParams?.metric === 'revenue'
      ? resolvedSearchParams.metric
      : 'total';
  const [weeklyInvoices, fortnightInvoices] = await Promise.all([listInvoices(), listFortnightInvoices()]);
  const invoices = filterInvoicesByMetric([
    ...weeklyInvoices.map((invoice) => ({
      ...invoice,
      invoiceType: 'Weekly',
      routeType: 'weekly',
    })),
    ...fortnightInvoices.map((invoice) => ({
      ...invoice,
      invoiceType: String(invoice.description || '').toLowerCase().includes('onboarding') ? 'Onboarding Fees' : 'Fortnight',
      routeType: 'fortnight',
    })),
  ].sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return secondTime - firstTime;
  }), metric);

  return (
    <AdminShell eyebrow="Review weekly, fortnight, and onboarding invoice records from one place" title="Invoices">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2>Invoice Register</h2>
            <p>Track weekly, fortnight, and onboarding invoice delivery from one admin view.</p>
          </div>
          <Link className="admin-primary-button" href="/admin/website-admin/invoices/new">
            Create Invoice
          </Link>
        </div>

        {invoices.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Type</th>
                  <th>Billed To</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={`${invoice.routeType}-${invoice._id}`}>
                    <td>
                      <strong>{invoice.invoiceNumber}</strong>
                      <span>{invoice.invoiceDate}</span>
                    </td>
                    <td>{invoice.invoiceType}</td>
                    <td>
                      <strong>{invoice.billedToName}</strong>
                      <span>{invoice.billedToEmail}</span>
                    </td>
                    <td>{invoice.dueDate}</td>
                    <td>${invoice.total}</td>
                    <td>
                      <InvoicePaymentStatusControl
                        initialStatus={getInvoicePaymentStatus(invoice)}
                        invoiceId={invoice._id}
                        routeType={invoice.routeType}
                      />
                    </td>
                    <td className="admin-actions-cell">
                      {invoice.routeType === 'weekly' ? (
                        <InvoiceRegisterActions invoiceId={invoice._id} />
                      ) : (
                        <FortnightInvoiceRegisterActions invoiceId={invoice._id} />
                      )}
                    </td>
                  </tr>
                ))}
               </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p>No invoices are stored right now. Create a new invoice to generate a branded PDF and send it by email.</p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
