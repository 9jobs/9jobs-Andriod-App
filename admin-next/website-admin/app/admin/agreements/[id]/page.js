import Link from 'next/link';
import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import AgreementActions from '@/components/admin/AgreementActions';
import StatusBadge from '@/components/admin/StatusBadge';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import {
  generateAndStoreAgreementPdf,
  getAgreementById,
  getAgreementDocumentById,
  recoverFailedInternalAgreementCompletions,
  syncAgreementDocumentStatusFromDocuSign,
} from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

function DetailRow({ label, value }) {
  return (
    <div className="admin-detail-row">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export default async function AgreementDetailPage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;

  let agreementDocument = await getAgreementDocumentById(id);

  if (agreementDocument?.status === 'completion_processing_failed') {
    await recoverFailedInternalAgreementCompletions(1).catch((err) =>
      console.error('Detail page recovery error:', err)
    );
    agreementDocument = await getAgreementDocumentById(id);
  }

  if (agreementDocument?.docuSignEnvelopeId) {
    await syncAgreementDocumentStatusFromDocuSign(agreementDocument);
    agreementDocument = await getAgreementDocumentById(id);
  }

  let agreement = agreementDocument ? await getAgreementById(id) : null;

  if (!agreement) {
    notFound();
  }

  if (!agreement.generatedPdfUrl) {
    const agreementDocument = await getAgreementDocumentById(id);

    if (agreementDocument) {
      const result = await generateAndStoreAgreementPdf(agreementDocument);
      agreement = result.agreement;
    }
  }

  return (
    <AdminShell eyebrow="Generate, preview, send, and download" title={agreement.clientName}>
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2>Agreement Overview</h2>
            <p>{agreement.clientEmail}</p>
          </div>
          <StatusBadge status={agreement.status} />
        </div>

        <AgreementActions
          agreementId={agreement._id}
          hasGeneratedPdf={Boolean(agreement.generatedPdfUrl)}
          hasSignedPdf={Boolean(agreement.signedPdfUrl)}
          isCompleted={agreement.status === 'completed'}
        />

        <div className="admin-detail-grid">
          <div className="admin-detail-card">
            <h3>Client Details</h3>
            <DetailRow label="Name" value={agreement.clientName} />
            <DetailRow label="Email" value={agreement.clientEmail} />
            <DetailRow label="Phone" value={agreement.clientPhone} />
          </div>
          <div className="admin-detail-card">
            <h3>Provider Details</h3>
            <DetailRow label="Provider" value={agreement.providerName} />
            <DetailRow label="Email" value={agreement.providerEmail} />
            <DetailRow label="Phone" value={agreement.providerPhone} />
            <DetailRow label="Signer" value={agreement.providerSignatureName} />
          </div>
          <div className="admin-detail-card">
            <h3>Agreement Details</h3>
            <DetailRow label="Date" value={agreement.agreementDate} />
            <DetailRow label="Package" value={agreement.packageName} />
            <DetailRow label="Price" value={agreement.servicePrice} />
            <DetailRow label="Weekly Target" value={agreement.weeklyJobTarget} />
            <DetailRow label="Initial Term" value={agreement.initialTerm} />
          </div>
        </div>

      </section>

      <section className="admin-preview-layout">
        <article className="admin-panel admin-preview-panel">
          <div className="admin-panel__header">
            <div>
              <h2>PDF Preview</h2>
              <p>The preview matches the PDF sent through DocuSign.</p>
            </div>
            {agreement.generatedPdfUrl ? (
              <a
                className="admin-ghost-button admin-ghost-button--link"
                href={`/admin/website-admin/api/agreements/${agreement._id}/preview-pdf`}
                rel="noreferrer"
                target="_blank"
              >
                Open Preview
              </a>
            ) : null}
          </div>

          {agreement.generatedPdfUrl ? (
            <iframe
              className="admin-pdf-frame"
              src={`/admin/website-admin/api/agreements/${agreement._id}/preview-pdf`}
              title="Agreement PDF preview"
            />
          ) : (
            <div className="admin-empty-state">
              <p>Generate the PDF preview to review the exact contract before sending it to DocuSign.</p>
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Activity Timeline</h2>
              <p>Envelope and document updates for this agreement.</p>
            </div>
            <Link className="admin-link" href="/admin/website-admin/agreements">
              Back to list
            </Link>
          </div>

          <div className="admin-timeline">
            {agreement.envelopeEvents?.length ? (
              agreement.envelopeEvents
                .slice()
                .reverse()
                .map((event, index) => (
                  <div className="admin-timeline__item" key={`${event.receivedAt}-${index}`}>
                    <strong>{event.status}</strong>
                    <span>{event.receivedAt ? event.receivedAt.slice(0, 19).replace('T', ' ') : 'Pending'}</span>
                  </div>
                ))
            ) : (
              <div className="admin-empty-state">
                <p>No DocuSign events recorded yet. Generate the PDF, then send the agreement to start tracking the envelope lifecycle.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
