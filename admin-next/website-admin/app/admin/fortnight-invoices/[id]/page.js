import Link from 'next/link';
import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import FortnightInvoiceActions from '@/components/admin/FortnightInvoiceActions';
import StatusBadge from '@/components/admin/StatusBadge';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import {
  generateAndStoreFortnightInvoicePdf,
  getFortnightInvoiceById,
  getFortnightInvoiceDocumentById,
} from '@/lib/fortnight-invoices/service';

export const dynamic = 'force-dynamic';

function DetailRow({ label, value }) {
  return (
    <div className="admin-detail-row">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export default async function FortnightInvoiceDetailPage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;
  let invoice = await getFortnightInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  if (!invoice.generatedPdfUrl) {
    const invoiceDocument = await getFortnightInvoiceDocumentById(id);

    if (invoiceDocument) {
      const result = await generateAndStoreFortnightInvoicePdf(invoiceDocument);
      invoice = result.invoice;
    }
  }

  return (
    <AdminShell eyebrow="Preview and email the branded fortnight invoice PDF" title={invoice.invoiceNumber}>
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2>Fortnight Invoice Overview</h2>
            <p>{invoice.billedToEmail}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <FortnightInvoiceActions
          hasGeneratedPdf={Boolean(invoice.generatedPdfUrl)}
          initialAutopayStatus={invoice.autopayStatus || 'not_applicable'}
          initialCheckoutUrl={invoice.stripeCheckoutUrl || ''}
          initialPaymentLinkSentAt={invoice.paymentLinkSentAt || ''}
          initialPaymentMode={invoice.paymentMode || 'upfront'}
          initialStripeSubscriptionId={invoice.stripeSubscriptionId || ''}
          invoiceId={invoice._id}
        />

        <div className="admin-detail-grid">
          <div className="admin-detail-card">
            <h3>Billed To</h3>
            <DetailRow label="Name" value={invoice.billedToName} />
            <DetailRow label="Email" value={invoice.billedToEmail} />
            <DetailRow label="Phone" value={invoice.billedToPhone} />
          </div>
          <div className="admin-detail-card">
            <h3>Invoice Details</h3>
            <DetailRow label="Invoice Number" value={invoice.invoiceNumber} />
            <DetailRow label="Month" value={invoice.monthLabel} />
            <DetailRow label="Issued" value={invoice.issuedDate} />
            <DetailRow label="Valid" value={invoice.validUntil} />
            <DetailRow label="Due" value={invoice.dueDate} />
          </div>
          <div className="admin-detail-card">
            <h3>Line Item</h3>
            <DetailRow label="Description" value={invoice.description} />
            <DetailRow label="Duration" value={invoice.duration} />
            <DetailRow label="Total" value={`$${invoice.total}`} />
          </div>
          <div className="admin-detail-card">
            <h3>Payment Details</h3>
            <DetailRow label="Account Name" value={invoice.accountName} />
            <DetailRow label="Bank Name" value={invoice.bankName} />
            <DetailRow label="Account Number" value={invoice.accountNumber} />
            <DetailRow label="BSB" value={invoice.bsb} />
          </div>
        </div>
      </section>

      <section className="admin-preview-layout">
        <article className="admin-panel admin-preview-panel">
          <div className="admin-panel__header">
            <div>
              <h2>PDF Preview</h2>
              <p>The preview matches the PDF sent to the client by email.</p>
            </div>
            {invoice.generatedPdfUrl ? (
              <a
                className="admin-ghost-button admin-ghost-button--link"
                href={`/admin/website-admin/api/fortnight-invoices/${invoice._id}/preview-pdf`}
                rel="noreferrer"
                target="_blank"
              >
                Open Preview
              </a>
            ) : null}
          </div>

          {invoice.generatedPdfUrl ? (
            <iframe
              className="admin-pdf-frame"
              src={`/admin/website-admin/api/fortnight-invoices/${invoice._id}/preview-pdf`}
              title="Fortnight invoice PDF preview"
            />
          ) : (
            <div className="admin-empty-state">
              <p>Generate the invoice preview to review the exact PDF before sending it by email.</p>
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Email Delivery</h2>
              <p>Send Invoice from the 9Jobs mailbox with the PDF attached.</p>
            </div>
            <Link className="admin-link" href="/admin/website-admin/fortnight-invoices">
              Back to list
            </Link>
          </div>

          <div className="admin-detail-card">
            <DetailRow label="Recipient" value={invoice.billedToEmail} />
            <DetailRow label="Status" value={invoice.status} />
            <DetailRow label="Sent At" value={invoice.sentAt ? invoice.sentAt.slice(0, 19).replace('T', ' ') : 'Not sent'} />
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
