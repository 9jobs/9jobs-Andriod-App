'use client';

import { useState } from 'react';
import { Search, Download, Eye, X, Calendar, MapPin, Briefcase, DollarSign, Clock, Shield, Mail, Edit3, Trash2, Link2, Ban, ExternalLink, MoreHorizontal } from 'lucide-react';

import { useToast } from '@/components/admin/ToastProvider';

const billingPlanOptions = [
  { value: 'none', label: 'No billing plan' },
  { value: 'standard_weekly', label: 'Standard Weekly' },
  { value: 'success_based', label: 'Two-Month Success-Based' },
];

function ensureBilling(submission) {
  return {
    planType: submission?.billing?.planType || 'none',
    planLabel: submission?.billing?.planLabel || '',
    billingState: submission?.billing?.billingState || 'PENDING_AGREEMENT',
    agreedWeeklyAmountCents: submission?.billing?.agreedWeeklyAmountCents || 0,
    onboardingFeeCents: submission?.billing?.onboardingFeeCents || 20000,
    latestSuccessFeeAmountCents: submission?.billing?.latestSuccessFeeAmountCents || 0,
    currency: submission?.billing?.currency || 'aud',
    billingFrequency: submission?.billing?.billingFrequency || 'week',
    agreementId: submission?.billing?.agreementId || '',
    agreementUrl: submission?.billing?.agreementUrl || '',
    agreementStatus: submission?.billing?.agreementStatus || '',
    checkoutTermsVersion: submission?.billing?.checkoutTermsVersion || 'weekly-subscription-v2',
    subscriptionAuthorisationStatus: submission?.billing?.subscriptionAuthorisationStatus || 'inactive',
    stripeCustomerId: submission?.billing?.stripeCustomerId || '',
    stripeSubscriptionId: submission?.billing?.stripeSubscriptionId || '',
    currentPeriodEnd: submission?.billing?.currentPeriodEnd || null,
    successFeeInvoiceId: submission?.billing?.successFeeInvoiceId || '',
    successFeeCheckoutSessionId: submission?.billing?.successFeeCheckoutSessionId || '',
    auditLog: Array.isArray(submission?.billing?.auditLog) ? submission.billing.auditLog : [],
  };
}

function textValue(value, fallback = 'N/A') {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === undefined || normalized === null || normalized === '') {
    return fallback;
  }
  return String(normalized);
}

function normalizeSubmission(submission) {
  return {
    ...submission,
    fullName: textValue(submission?.fullName),
    contactNo: textValue(submission?.contactNo),
    workingRights: textValue(submission?.workingRights),
    address: textValue(submission?.address),
    dob: textValue(submission?.dob),
    expectedSalary: textValue(submission?.expectedSalary),
    preferredJobLocation: textValue(submission?.preferredJobLocation),
    workType: textValue(submission?.workType),
    noticePeriod: textValue(submission?.noticePeriod),
    email: textValue(submission?.email),
    password: textValue(submission?.password),
    preferredRole: textValue(submission?.preferredRole),
    resumeFileName: textValue(submission?.resumeFileName, 'CV'),
    coverLetterFileName: textValue(submission?.coverLetterFileName, ''),
  };
}

function mergeBilling(submission) {
  return {
    ...normalizeSubmission(submission),
    billing: ensureBilling(submission),
  };
}

export default function ClientInfoList({ initialSubmissions }) {
  const { pushToast } = useToast();
  const [submissions, setSubmissions] = useState((initialSubmissions || []).map(mergeBilling));
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  const filteredSubmissions = submissions.filter((sub) => {
    const term = search.toLowerCase();
    return (
      textValue(sub.fullName, '').toLowerCase().includes(term) ||
      textValue(sub.email, '').toLowerCase().includes(term) ||
      textValue(sub.contactNo, '').toLowerCase().includes(term) ||
      textValue(sub.preferredRole, '').toLowerCase().includes(term)
    );
  });

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatMoney = (amountCents) => {
    if (!amountCents) return 'N/A';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amountCents / 100);
  };

  const syncSubmission = (updated) => {
    const normalized = mergeBilling(updated);
    setSubmissions((prev) => prev.map((sub) => (sub._id === normalized._id ? normalized : sub)));
    setSelectedSub((prev) => (prev && prev._id === normalized._id ? normalized : prev));
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this client submission? This will also remove their resume permanently.')) {
      return;
    }

    try {
      const res = await fetch(`/admin/website-admin/api/admin/client-info/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((sub) => sub._id !== id));
        pushToast({ title: 'Submission deleted successfully.', tone: 'info' });
      } else {
        const data = await res.json();
        pushToast({ title: data.error || 'Failed to delete submission.', tone: 'error' });
      }
    } catch (err) {
      console.error(err);
      pushToast({ title: 'An error occurred while deleting submission.', tone: 'error' });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/admin/website-admin/api/admin/client-info/${editingSub._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSub),
      });
      if (res.ok) {
        const updated = await res.json();
        syncSubmission(updated);
        setEditingSub(null);
        pushToast({ title: 'Client and billing details saved.', tone: 'info' });
      } else {
        const data = await res.json();
        pushToast({ title: data.error || 'Failed to save changes.', tone: 'error' });
      }
    } catch (err) {
      console.error(err);
      pushToast({ title: 'An error occurred while updating submission.', tone: 'error' });
    }
  };

  const handleGenerateBillingLink = async (id) => {
    try {
      const response = await fetch(`/admin/website-admin/api/admin/client-info/${id}/billing-link`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to generate billing link.');
      }

      await navigator.clipboard.writeText(data.url);
      pushToast({ title: 'Private billing link generated and copied.', tone: 'info' });
    } catch (error) {
      pushToast({ title: error.message || 'Unable to generate billing link.', tone: 'error' });
    }
  };

  const handleOpenPortal = async (id) => {
    try {
      const response = await fetch('/admin/website-admin/api/billing/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to open customer portal.');
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      pushToast({ title: error.message || 'Unable to open customer portal.', tone: 'error' });
    }
  };

  const handleCancelSubscription = async (id) => {
    if (!confirm('Cancel this weekly subscription at period end?')) {
      return;
    }

    try {
      const response = await fetch('/admin/website-admin/api/billing/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to cancel subscription.');
      }

      const detailResponse = await fetch(`/admin/website-admin/api/billing/client/${id}`);
      const detailData = await detailResponse.json();
      if (detailResponse.ok) {
        syncSubmission({
          ...selectedSub,
          _id: detailData._id,
          fullName: detailData.fullName,
          email: detailData.email,
          billing: detailData.billing,
        });
      }
      pushToast({ title: 'Subscription marked to cancel at period end.', tone: 'info' });
    } catch (error) {
      pushToast({ title: error.message || 'Unable to cancel subscription.', tone: 'error' });
    }
  };

  const handleCreateSuccessFee = async (id) => {
    const value = window.prompt('Enter success-fee amount in AUD (for example 2500).');
    if (!value) {
      return;
    }

    const amountNumber = Number(value);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      pushToast({ title: 'Enter a valid positive success-fee amount.', tone: 'error' });
      return;
    }

    try {
      const response = await fetch('/admin/website-admin/api/billing/success-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: id,
          amountCents: Math.round(amountNumber * 100),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create success-fee checkout.');
      }

      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      pushToast({ title: 'Success-fee checkout created.', tone: 'info' });
    } catch (error) {
      pushToast({ title: error.message || 'Unable to create success-fee checkout.', tone: 'error' });
    }
  };

  const updateEditField = (field, value) => {
    setEditingSub((prev) => ({ ...prev, [field]: value }));
  };

  const updateBillingField = (field, value) => {
    setEditingSub((prev) => ({
      ...prev,
      billing: {
        ...ensureBilling(prev),
        [field]: value,
      },
    }));
  };

  return (
    <section className="admin-panel admin-client-register" style={{ width: '100%' }}>
      <div className="admin-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Client Information Register</h2>
          <p>Manage client submissions, billing terms, and private Stripe checkout links from one register.</p>
        </div>

        <div className="admin-client-register__search" style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.2rem',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '0.9rem',
              background: 'var(--color-bg)',
            }}
          />
        </div>
      </div>

      {filteredSubmissions.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Client Name</th>
                <th style={{ whiteSpace: 'nowrap' }}>Contact Number</th>
                <th style={{ whiteSpace: 'nowrap' }}>Date Of Birth</th>
                <th style={{ whiteSpace: 'nowrap' }}>Preferred Role</th>
                <th style={{ whiteSpace: 'nowrap' }}>Working Rights</th>
                <th style={{ whiteSpace: 'nowrap' }}>Work Type</th>
                <th style={{ whiteSpace: 'nowrap' }}>Expected Salary</th>
                <th style={{ whiteSpace: 'nowrap' }}>Notice Period</th>
                <th style={{ whiteSpace: 'nowrap' }}>Preferred Job Location</th>
                <th style={{ whiteSpace: 'nowrap' }}>Current Full Address</th>
                <th style={{ whiteSpace: 'nowrap' }}>Account Email</th>
                <th style={{ whiteSpace: 'nowrap' }}>Password</th>
                <th style={{ whiteSpace: 'nowrap' }}>Billing Plan</th>
                <th style={{ whiteSpace: 'nowrap' }}>Billing Status</th>
                <th style={{ whiteSpace: 'nowrap' }}>Resume</th>
                <th style={{ whiteSpace: 'nowrap' }}>Cover Letter</th>
                <th style={{ whiteSpace: 'nowrap' }}>Submitted At</th>
                <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => (
                <tr key={sub._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <strong>{sub.fullName}</strong>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.contactNo}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.dob}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><strong>{sub.preferredRole}</strong></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.workingRights}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.workType}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.expectedSalary}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.noticePeriod}</td>
                  <td style={{ minWidth: '220px' }}>{sub.preferredJobLocation}</td>
                  <td style={{ minWidth: '260px', whiteSpace: 'normal' }}>{sub.address}</td>
                  <td style={{ minWidth: '220px' }}>{sub.email}</td>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{sub.password}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{ensureBilling(sub).planType.replaceAll('_', ' ')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{ensureBilling(sub).billingState.replaceAll('_', ' ')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <a
                      className="admin-link admin-link--download"
                      href={`/admin/website-admin/api/admin/client-info/${sub._id}/resume`}
                      download
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', textDecoration: 'none' }}
                    >
                      <Download size={14} /> Resume
                    </a>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {sub.coverLetterFileName ? (
                      <a
                        className="admin-link admin-link--download"
                        href={`/admin/website-admin/api/admin/client-info/${sub._id}/cover-letter`}
                        download
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        <Download size={14} /> Cover Letter
                      </a>
                    ) : (
                      'Optional'
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(sub.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <details style={{ position: 'relative', display: 'inline-block' }}>
                      <summary
                        className="admin-ghost-button"
                        style={{
                          listStyle: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '38px',
                          height: '38px',
                          padding: 0,
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </summary>
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          minWidth: '140px',
                          background: '#fff',
                          border: '1px solid var(--color-border)',
                          borderRadius: '12px',
                          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                          padding: '8px',
                          zIndex: 30,
                          display: 'grid',
                          gap: '6px',
                        }}
                      >
                        <button
                          className="admin-ghost-button"
                          onClick={() => setSelectedSub(sub)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start', width: '100%' }}
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          className="admin-ghost-button"
                          onClick={() => setEditingSub(mergeBilling(sub))}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start', width: '100%', color: '#2563eb' }}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="admin-ghost-button"
                          onClick={() => handleGenerateBillingLink(sub._id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start', width: '100%', color: '#7c3aed' }}
                        >
                          <Link2 size={13} /> Link
                        </button>
                        <button
                          className="admin-ghost-button"
                          onClick={() => handleDelete(sub._id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start', width: '100%', color: '#dc2626' }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
            {search ? 'No submissions match your search query.' : 'No client submissions are stored right now.'}
          </p>
        </div>
      )}

      {editingSub && (
        <div
          className="admin-client-modal admin-client-modal--overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setEditingSub(null)}
        >
          <div
            className="admin-client-modal__card"
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '760px',
              borderRadius: '12px',
              padding: '2rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingSub(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Edit Client Information</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Modify candidate details and Stripe billing terms below.</p>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Full Name *</label>
                  <input required type="text" value={editingSub.fullName} onChange={(e) => updateEditField('fullName', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Contact Number *</label>
                  <input required type="text" value={editingSub.contactNo} onChange={(e) => updateEditField('contactNo', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Date of Birth *</label>
                  <input required type="text" value={editingSub.dob} onChange={(e) => updateEditField('dob', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Preferred Role *</label>
                  <input required type="text" value={editingSub.preferredRole} onChange={(e) => updateEditField('preferredRole', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Working Rights *</label>
                  <input required type="text" value={editingSub.workingRights} onChange={(e) => updateEditField('workingRights', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Work Type *</label>
                  <input required type="text" value={editingSub.workType} onChange={(e) => updateEditField('workType', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Expected Salary *</label>
                  <input required type="text" value={editingSub.expectedSalary} onChange={(e) => updateEditField('expectedSalary', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Notice Period *</label>
                  <input required type="text" value={editingSub.noticePeriod} onChange={(e) => updateEditField('noticePeriod', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Email Address *</label>
                  <input required type="email" value={editingSub.email} onChange={(e) => updateEditField('email', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Password *</label>
                  <input required type="text" value={editingSub.password} onChange={(e) => updateEditField('password', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Preferred Job Location *</label>
                <input required type="text" value={editingSub.preferredJobLocation} onChange={(e) => updateEditField('preferredJobLocation', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Current Address *</label>
                <textarea required value={editingSub.address} onChange={(e) => updateEditField('address', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', minHeight: '80px' }} />
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'grid', gap: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Billing Terms</h4>
                <div className="admin-client-modal__grid admin-client-modal__grid--tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Billing plan</label>
                    <select value={editingSub.billing.planType} onChange={(e) => updateBillingField('planType', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                      {billingPlanOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Agreement status</label>
                    <input type="text" value={editingSub.billing.agreementStatus} onChange={(e) => updateBillingField('agreementStatus', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                  </div>
                </div>
                <div className="admin-client-modal__grid admin-client-modal__grid--tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Weekly amount (AUD)</label>
                    <input type="number" min="0" step="0.01" value={(editingSub.billing.agreedWeeklyAmountCents || 0) / 100} onChange={(e) => updateBillingField('agreedWeeklyAmountCents', Math.round(Number(e.target.value || 0) * 100))} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Onboarding fee (AUD)</label>
                    <input type="number" min="0" step="0.01" value={(editingSub.billing.onboardingFeeCents || 0) / 100} onChange={(e) => updateBillingField('onboardingFeeCents', Math.round(Number(e.target.value || 0) * 100))} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                  </div>
                </div>
                <div className="admin-client-modal__grid admin-client-modal__grid--tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Agreement ID</label>
                    <input type="text" value={editingSub.billing.agreementId} onChange={(e) => updateBillingField('agreementId', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Agreement URL</label>
                    <input type="url" value={editingSub.billing.agreementUrl} onChange={(e) => updateBillingField('agreementUrl', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                  </div>
                </div>
              </div>

              <div className="admin-client-modal__actions" style={{ display: 'flex', gap: '12px', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.2rem' }}>
                <button type="submit" className="admin-primary-button" style={{ minWidth: '120px' }}>
                  Save Changes
                </button>
                <button type="button" className="admin-ghost-button" onClick={() => setEditingSub(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSub && (
        <div
          className="admin-client-modal admin-client-modal--overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setSelectedSub(null)}
        >
          <div
            className="admin-client-modal__card"
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '760px',
              borderRadius: '12px',
              padding: '2rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSub(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Client Profile</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.5rem' }}>{selectedSub.fullName}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Submitted on {formatDate(selectedSub.createdAt)}</p>
            </div>

            <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Mail size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Contact Email
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.email}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Contact Number
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.contactNo}</p>
              </div>
            </div>

            <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Briefcase size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Preferred Role
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.preferredRole}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <DollarSign size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Expected Salary
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.expectedSalary}</p>
              </div>
            </div>

            <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Working Rights
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.workingRights}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Briefcase size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Work Type
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.workType}</p>
              </div>
            </div>

            <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Notice Period
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.noticePeriod}</p>
              </div>
              <div />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Date of Birth
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.dob}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Preferred Location
                </h4>
                <p style={{ fontWeight: '600' }}>{selectedSub.preferredJobLocation}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Address</h4>
              <p style={{ fontWeight: '600', whiteSpace: 'pre-line' }}>{selectedSub.address}</p>
            </div>

            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Cover Letter</h4>
              <p style={{ fontWeight: '600' }}>{selectedSub.coverLetterFileName || 'Optional - not uploaded'}</p>
            </div>

            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Billing</h3>
            <div className="admin-client-modal__grid admin-client-modal__grid--tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Plan</h4>
                  <p style={{ fontWeight: '600' }}>{selectedSub.billing.planType.replaceAll('_', ' ')}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Billing State</h4>
                  <p style={{ fontWeight: '600' }}>{selectedSub.billing.billingState.replaceAll('_', ' ')}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Weekly amount</h4>
                  <p style={{ fontWeight: '600' }}>{formatMoney(selectedSub.billing.agreedWeeklyAmountCents)}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Onboarding fee</h4>
                  <p style={{ fontWeight: '600' }}>{formatMoney(selectedSub.billing.onboardingFeeCents)}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Agreement</h4>
                  <p style={{ fontWeight: '600' }}>{selectedSub.billing.agreementId || 'Not linked'}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Stripe Subscription</h4>
                  <p style={{ fontWeight: '600' }}>{selectedSub.billing.stripeSubscriptionId || 'Not active'}</p>
                </div>
              </div>
              {selectedSub.billing.agreementUrl ? (
                <a href={selectedSub.billing.agreementUrl} target="_blank" rel="noreferrer" className="admin-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                  <ExternalLink size={14} /> Open Agreement
                </a>
              ) : null}
            </div>

            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Account Details</h3>
              <div className="admin-client-modal__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    <Mail size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Email Address
                  </h4>
                  <p style={{ fontWeight: '600' }}>{selectedSub.email}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Password</h4>
                  <p style={{ fontWeight: '600', fontFamily: 'monospace' }}>{selectedSub.password}</p>
                </div>
              </div>
            </div>

            <div className="admin-client-modal__actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <a
                className="admin-primary-button"
                href={`/admin/website-admin/api/admin/client-info/${selectedSub._id}/resume`}
                download
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={16} /> Download Resume ({selectedSub.resumeFileName || 'CV'})
              </a>
              {selectedSub.coverLetterFileName ? (
                <a
                  className="admin-ghost-button"
                  href={`/admin/website-admin/api/admin/client-info/${selectedSub._id}/cover-letter`}
                  download
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} /> Download Cover Letter ({selectedSub.coverLetterFileName})
                </a>
              ) : null}
              <button className="admin-ghost-button" onClick={() => handleGenerateBillingLink(selectedSub._id)}>
                <Link2 size={14} style={{ marginRight: '6px' }} /> Generate billing link
              </button>
              <button className="admin-ghost-button" onClick={() => handleOpenPortal(selectedSub._id)}>
                <ExternalLink size={14} style={{ marginRight: '6px' }} /> Customer portal
              </button>
              <button className="admin-ghost-button" onClick={() => handleCancelSubscription(selectedSub._id)}>
                <Ban size={14} style={{ marginRight: '6px' }} /> Cancel at period end
              </button>
              <button className="admin-ghost-button" onClick={() => handleCreateSuccessFee(selectedSub._id)}>
                <DollarSign size={14} style={{ marginRight: '6px' }} /> Success fee
              </button>
              <button className="admin-ghost-button" onClick={() => setSelectedSub(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 760px) {
          .admin-client-register__search {
            width: 100% !important;
          }

          .admin-client-modal--overlay {
            align-items: flex-start !important;
            justify-content: stretch !important;
            padding: 12px;
            overflow-y: auto;
          }

          .admin-client-modal__card {
            max-width: none !important;
            max-height: none !important;
            min-height: calc(100dvh - 24px);
            padding: 1.25rem !important;
            border-radius: 16px !important;
          }

          .admin-client-modal__grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }

          .admin-client-modal__actions {
            flex-direction: column;
          }

          .admin-client-modal__actions :global(.admin-primary-button),
          .admin-client-modal__actions :global(.admin-ghost-button) {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
