import Link from 'next/link';
import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import FortnightAgreementActions from '@/components/admin/FortnightAgreementActions';
import StatusBadge from '@/components/admin/StatusBadge';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import {
  generateAndStoreAgreementPdf,
  getAgreementById,
  getAgreementDocumentById,
} from '@/lib/fortnight-agreements/service';

export const dynamic = 'force-dynamic';

function DetailRow({ label, value }) {
  return (
    <div className="admin-detail-row">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export default async function FortnightAgreementDetailPage({ params }) {
  await requireAdminPageSession();
  const { id } = await params;
  let agreementDocument = await getAgreementDocumentById(id);

  if (!agreementDocument) {
    notFound();
  }

  let agreement = await getAgreementById(id);

  if (!agreement.generatedPdfUrl) {
    const result = await generateAndStoreAgreementPdf(agreementDocument);
    agreement = result.agreement;
  }

  return (
    <AdminShell eyebrow="Generate, preview, send, and download" title={agreement.clientName}>
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2>Fortnight Agreement Overview</h2>
            <p>{agreement.clientEmail}</p>
          </div>
          <StatusBadge status={agreement.status} />
        </div>

        <FortnightAgreementActions
          agreementId={agreement._id}
          status={agreement.status}
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
            <DetailRow label="Service Period" value={agreement.initialTerm} />
            <DetailRow label="Upfront Service Fee" value={agreement.servicePrice} />
          </div>
        </div>

      </section>

      <section className="admin-preview-layout">
        <article className="admin-panel admin-preview-panel">
          <div className="admin-panel__header">
            <div>
              <h2>PDF Preview</h2>
              <p>The preview shows the dynamic contract parameters.</p>
            </div>
            {agreement.generatedPdfUrl ? (
              <a
                className="admin-ghost-button admin-ghost-button--link"
                href={`/admin/website-admin/api/fortnight-agreements/${agreement._id}/preview-pdf`}
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
              src={`/admin/website-admin/api/fortnight-agreements/${agreement._id}/preview-pdf`}
              title="Fortnight Agreement PDF preview"
            />
          ) : (
            <div className="admin-empty-state">
              <p>Generate the PDF preview to review the contract before sending.</p>
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Signature Link Status</h2>
              <p>Copy or share the signing session URL below.</p>
            </div>
            <Link className="admin-link" href="/admin/website-admin/fortnight-agreements">
              Back to list
            </Link>
          </div>

          <div className="admin-notes-card">
            {agreement.status === 'draft' || agreement.status === 'previewed' ? (
              <p style={{ color: '#64748b' }}>Generate preview and send the contract to initialize client signing link.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: '#475569' }}>Signer Stage:</strong>
                  <div style={{ marginTop: '4px' }}>
                    <StatusBadge status={agreement.status} />
                  </div>
                </div>
                {agreement.clientSigningTokenHash && !agreement.clientTokenUsedAt && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#475569' }}>Client Token Status:</strong>
                    <p style={{ fontSize: '11px', color: '#1e293b', margin: '4px 0 0 0', wordBreak: 'break-all', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '4px' }}>
                      Active (Pending Signature)
                    </p>
                  </div>
                )}
                {agreement.providerSigningTokenHash && !agreement.providerTokenUsedAt && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#475569' }}>Provider Token Status:</strong>
                    <p style={{ fontSize: '11px', color: '#1e293b', margin: '4px 0 0 0', wordBreak: 'break-all', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '4px' }}>
                      Active (Pending Provider Signature)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
