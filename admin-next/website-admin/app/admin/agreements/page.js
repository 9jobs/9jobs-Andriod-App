import Link from 'next/link';

import AdminShell from '@/components/admin/AdminShell';
import AgreementRowActions from '@/components/admin/AgreementRowActions';
import AgreementRegisterActions from '@/components/admin/AgreementRegisterActions';
import StatusBadge from '@/components/admin/StatusBadge';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import {
  listAdminAgreements,
  scheduleAgreementMaintenance,
} from '@/lib/agreements/service';

export const dynamic = 'force-dynamic';

const PENDING_AGREEMENT_STATUSES = [
  'draft',
  'previewed',
  'sent',
  'delivered',
  'viewed',
  'sent_to_client',
  'client_signed',
  'sent_to_provider',
  'completion_processing',
  'completion_processing_failed',
];

function filterAgreementsByMetric(agreements, metric) {
  if (metric === 'signed') {
    return agreements.filter((agreement) => agreement.status === 'completed');
  }

  if (metric === 'pending') {
    return agreements.filter((agreement) => PENDING_AGREEMENT_STATUSES.includes(agreement.status));
  }

  return agreements;
}

export default async function AgreementsPage({ searchParams }) {
  await requireAdminPageSession();
  scheduleAgreementMaintenance();
  const resolvedSearchParams = await searchParams;
  const metric = resolvedSearchParams?.metric === 'signed' || resolvedSearchParams?.metric === 'pending'
    ? resolvedSearchParams.metric
    : 'total';
  const agreements = filterAgreementsByMetric(await listAdminAgreements(), metric);

  return (
    <AdminShell eyebrow="Preview, send, and download agreements" title="Agreements">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2>Agreement Register</h2>
            <p>Track agreement status across generation, delivery, signing, and download.</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <Link className="admin-primary-button" href="/admin/website-admin/agreements" prefetch={false}>
                Standard
              </Link>
              <Link className="admin-ghost-button admin-ghost-button--link" href="/admin/website-admin/fortnight-agreements" prefetch={false}>
                Fortnight
              </Link>
            </div>
          </div>
          <AgreementRegisterActions hasAgreements={agreements.length > 0} />
        </div>

        {agreements.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Provider Signatory</th>
                  <th>Package</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((agreement) => (
                  <tr key={agreement._id}>
                    <td>
                      <strong>{agreement.clientName}</strong>
                      <span>{agreement.clientEmail}</span>
                    </td>
                    <td>{agreement.providerSignatureName}</td>
                    <td>{agreement.packageName}</td>
                    <td>
                      <StatusBadge status={agreement.status} />
                    </td>
                    <td>{agreement.sentAt ? agreement.sentAt.slice(0, 10) : 'Not sent'}</td>
                    <td className="admin-actions-cell" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <AgreementRowActions
                        agreementId={agreement._id}
                        hasSignedPdf={Boolean(agreement.signedPdfUrl)}
                        status={agreement.status}
                      />
                      {agreement.status === 'completed' && (
                        <a
                          className="admin-link admin-link--download"
                          href={`/admin/website-admin/api/docusign/download/${agreement._id}`}
                          download
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p>No agreements are stored right now. Start fresh and create a new agreement to generate the live PDF preview.</p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
