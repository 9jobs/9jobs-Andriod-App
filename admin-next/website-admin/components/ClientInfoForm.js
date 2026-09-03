'use client';

import { useState } from 'react';
import { Send, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Stagger, StaggerItem, MotionButton, Popup } from './Motion';

const emptyForm = {
  fullName: '',
  contactNo: '',
  workingRights: 'Australian Citizen',
  workingRightsCustom: '',
  address: '',
  dob: '',
  expectedSalary: '',
  preferredJobLocation: '',
  workType: 'Full-time',
  noticePeriod: '',
  email: '',
  password: '',
  preferredRole: '',
};

export default function ClientInfoForm() {
  const [formData, setFormData] = useState(emptyForm);
  const [resumeFile, setResumeFile] = useState(null); // { data, name, type }
  const [coverLetterFile, setCoverLetterFile] = useState(null); // { data, name, type }
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (!file) {
      setFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus({
        type: 'error',
        message: 'File size exceeds 5MB limit. Please upload a smaller file.',
      });
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFile({
        data: reader.result,
        name: file.name,
        type: file.type,
      });
      setStatus({ type: '', message: '' });
    };
    reader.readAsDataURL(file);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    if (!resumeFile) {
      setStatus({
        type: 'error',
        message: 'Please upload your resume to complete the form.',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/admin/website-admin/api/client-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          resumeData: resumeFile.data,
          resumeName: resumeFile.name,
          resumeType: resumeFile.type,
          coverLetterData: coverLetterFile?.data || '',
          coverLetterName: coverLetterFile?.name || '',
          coverLetterType: coverLetterFile?.type || '',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again.',
        });
        return;
      }

      setStatus({
        type: 'success',
        message: 'Thank you! Your information and resume have been submitted successfully. The team will contact you shortly.',
      });
      setFormData(emptyForm);
      setResumeFile(null);
      setCoverLetterFile(null);
      const fileInput = document.getElementById('resume-file-input');
      if (fileInput) fileInput.value = '';
      const coverLetterInput = document.getElementById('cover-letter-file-input');
      if (coverLetterInput) coverLetterInput.value = '';
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        message: 'Unable to reach the server. Please try again shortly.',
      });
    } finally {
      setLoading(false);
    }
  }

  const selectStyle = {
    width: '100%',
    minHeight: '52px',
    border: '1.5px solid rgba(218, 224, 224, 0.95)',
    borderRadius: '18px',
    background: '#f8fafa',
    padding: '0 18px',
    color: 'var(--fj-ink)',
    fontFamily: 'var(--fj-font)',
    fontSize: '0.94rem',
    outline: 'none',
    transition: 'all 0.2s',
  };

  return (
    <div className="client-info-form-container">
      <style>{`
        .client-info-form-container .field span {
          font-weight: 500 !important;
          color: #4b5563 !important;
          font-size: 0.86rem !important;
          text-transform: none !important;
          letter-spacing: normal !important;
        }

        .client-info-form-container input,
        .client-info-form-container select,
        .client-info-form-container textarea {
          border: 1px solid #e5e7eb !important;
          background-color: #f9fafb !important;
          border-radius: 12px !important;
          min-height: 48px !important;
          font-size: 0.92rem !important;
          color: #1f2937 !important;
          padding: 0 16px !important;
          box-shadow: none !important;
          transition: all 0.2s ease-in-out !important;
          font-weight: 400 !important;
        }

        .client-info-form-container textarea {
          padding: 12px 16px !important;
        }

        .client-info-form-container input:hover,
        .client-info-form-container select:hover,
        .client-info-form-container textarea:hover {
          border-color: #cbd5e1 !important;
        }

        .client-info-form-container input:focus,
        .client-info-form-container select:focus,
        .client-info-form-container textarea:focus {
          border-color: #3b82f6 !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }

        .client-info-form-container input:-webkit-autofill,
        .client-info-form-container input:-webkit-autofill:hover, 
        .client-info-form-container input:-webkit-autofill:focus, 
        .client-info-form-container input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f9fafb inset !important;
          -webkit-text-fill-color: #1f2937 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .client-info-form-container h2 {
          font-weight: 500 !important;
          color: var(--fj-ink) !important;
          letter-spacing: -0.02em !important;
        }

        .client-info-form-container h3 {
          font-weight: 600 !important;
          color: var(--fj-ink) !important;
          letter-spacing: -0.01em !important;
        }

        .client-info-form-container .btn-dark {
          border-radius: 12px !important;
          min-height: 48px !important;
          font-size: 0.95rem !important;
          font-weight: 500 !important;
        }
      `}</style>

      <Stagger as="form" className="form-card card fj-clean-form" onSubmit={handleSubmit} aria-busy={loading}>
        <div className="fj-form-intro">
          <span>Secure Onboarding</span>
          <h2>Personal & Professional Details</h2>
          <p>Please enter your details accurately. The admin team will review your profile shortly.</p>
        </div>

        <div className="form-grid">
          <StaggerItem className="field">
            <span>Full Name *</span>
            <input
              required
              type="text"
              placeholder="e.g. John Doe"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
            />
          </StaggerItem>

          <StaggerItem className="field">
            <span>Contact Number *</span>
            <input
              required
              type="tel"
              placeholder="e.g. +61 400 000 000"
              value={formData.contactNo}
              onChange={(e) => updateField('contactNo', e.target.value)}
            />
          </StaggerItem>
        </div>

        <div className="form-grid">
          <StaggerItem className="field">
            <span>Date of Birth *</span>
            <input
              required
              type="date"
              value={formData.dob}
              onChange={(e) => updateField('dob', e.target.value)}
            />
          </StaggerItem>

          <StaggerItem className="field">
            <span>Preferred Role *</span>
            <input
              required
              type="text"
              placeholder="e.g. Forklift Driver, Warehouse Assistant"
              value={formData.preferredRole}
              onChange={(e) => updateField('preferredRole', e.target.value)}
            />
          </StaggerItem>
        </div>

        <div className="form-grid">
          <StaggerItem className="field">
            <span>Working Rights *</span>
            <select
              value={formData.workingRights}
              onChange={(e) => updateField('workingRights', e.target.value)}
              style={selectStyle}
            >
              <option value="Australian Citizen">Australian Citizen</option>
              <option value="Permanent Resident (PR)">Permanent Resident (PR)</option>
              <option value="Student Visa (Subclass 500)">Student Visa (Subclass 500)</option>
              <option value="Temporary Graduate Visa (Subclass 485)">Temporary Graduate Visa (Subclass 485)</option>
              <option value="Temporary Skill Shortage Visa (Subclass 482)">Temporary Skill Shortage Visa (Subclass 482)</option>
              <option value="Working Holiday Visa (Subclass 417)">Working Holiday Holiday Visa (Subclass 417)</option>
              <option value="Other">Other (Please specify below)</option>
            </select>
          </StaggerItem>

          <StaggerItem className="field">
            <span>Work Type *</span>
            <select
              value={formData.workType}
              onChange={(e) => updateField('workType', e.target.value)}
              style={selectStyle}
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Casual">Casual</option>
            </select>
          </StaggerItem>
        </div>

        {formData.workingRights === 'Other' && (
          <StaggerItem className="field">
            <span>Specify Working Rights *</span>
            <input
              required
              type="text"
              placeholder="Type your visa subclass or working rights status"
              value={formData.workingRightsCustom}
              onChange={(e) => updateField('workingRightsCustom', e.target.value)}
            />
          </StaggerItem>
        )}

        <div className="form-grid">
          <StaggerItem className="field">
            <span>Expected Salary *</span>
            <input
              required
              type="text"
              placeholder="e.g. $75,000 + Super or $35/hr"
              value={formData.expectedSalary}
              onChange={(e) => updateField('expectedSalary', e.target.value)}
            />
          </StaggerItem>

          <StaggerItem className="field">
            <span>Notice Period *</span>
            <input
              required
              type="text"
              placeholder="e.g. Immediate, 2 weeks, 1 month"
              value={formData.noticePeriod}
              onChange={(e) => updateField('noticePeriod', e.target.value)}
            />
          </StaggerItem>
        </div>

        <StaggerItem className="field">
          <span>Preferred Job Location *</span>
          <input
            required
            type="text"
            placeholder="e.g. Melbourne VIC, Sydney NSW"
            value={formData.preferredJobLocation}
            onChange={(e) => updateField('preferredJobLocation', e.target.value)}
          />
        </StaggerItem>

        <StaggerItem className="field">
          <span>Current Full Address *</span>
          <textarea
            required
            placeholder="Enter your street address, suburb, state and postcode"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            style={{ minHeight: '110px' }}
          />
        </StaggerItem>

        <div style={{ borderTop: '1.5px solid rgba(218, 224, 224, 0.95)', paddingTop: '20px', marginTop: '10px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--fj-ink)' }}>Account Settings</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--fj-muted)', marginTop: '4px' }}>Specify your login credentials for access.</p>
        </div>

        <div className="form-grid">
          <StaggerItem className="field">
            <span>Email Address *</span>
            <input
              required
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </StaggerItem>

          <StaggerItem className="field">
            <span>Password *</span>
            <input
              required
              type="password"
              placeholder="Choose a password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </StaggerItem>
        </div>

        <div style={{ borderTop: '1.5px solid rgba(218, 224, 224, 0.95)', paddingTop: '20px', marginTop: '10px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--fj-ink)' }}>Upload Resume</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--fj-muted)', marginTop: '4px' }}>Please upload your CV (PDF, DOC, or DOCX up to 5MB).</p>
        </div>

        <StaggerItem className="field">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              htmlFor="resume-file-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '28px',
                border: '2px dashed rgba(218, 224, 224, 0.95)',
                borderRadius: '18px',
                cursor: 'pointer',
                background: '#f8fafa',
                transition: 'all 0.25s ease',
                textAlign: 'center',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--fj-ink)';
                e.currentTarget.style.background = '#f0f4f4';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(218, 224, 224, 0.95)';
                e.currentTarget.style.background = '#f8fafa';
              }}
            >
              {resumeFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fj-ink)' }}>
                  <FileText size={28} />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600' }}>{resumeFile.name}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--fj-muted)' }}>Ready for upload</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--fj-muted)' }}>
                  <Upload size={32} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--fj-muted)' }} />
                  <strong style={{ fontSize: '0.95rem', fontWeight: '600', display: 'block', color: 'var(--fj-ink)' }}>Click to choose a file</strong>
                  <span style={{ display: 'block', fontSize: '0.78rem', marginTop: '4px' }}>PDF, DOCX, or DOC up to 5MB</span>
                </div>
              )}
            </label>
            <input
              id="resume-file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e, setResumeFile)}
              style={{ display: 'none' }}
            />
          </div>
        </StaggerItem>

        <div style={{ borderTop: '1.5px solid rgba(218, 224, 224, 0.95)', paddingTop: '20px', marginTop: '10px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--fj-ink)' }}>Cover Letter (Optional)</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--fj-muted)', marginTop: '4px' }}>Upload a cover letter if available (PDF, DOC, or DOCX up to 5MB).</p>
        </div>

        <StaggerItem className="field">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              htmlFor="cover-letter-file-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '28px',
                border: '2px dashed rgba(218, 224, 224, 0.95)',
                borderRadius: '18px',
                cursor: 'pointer',
                background: '#f8fafa',
                transition: 'all 0.25s ease',
                textAlign: 'center',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--fj-ink)';
                e.currentTarget.style.background = '#f0f4f4';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(218, 224, 224, 0.95)';
                e.currentTarget.style.background = '#f8fafa';
              }}
            >
              {coverLetterFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fj-ink)' }}>
                  <FileText size={28} />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600' }}>{coverLetterFile.name}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--fj-muted)' }}>Ready for upload</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--fj-muted)' }}>
                  <Upload size={32} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--fj-muted)' }} />
                  <strong style={{ fontSize: '0.95rem', fontWeight: '600', display: 'block', color: 'var(--fj-ink)' }}>Click to choose a file</strong>
                  <span style={{ display: 'block', fontSize: '0.78rem', marginTop: '4px' }}>PDF, DOCX, or DOC up to 5MB</span>
                </div>
              )}
            </label>
            <input
              id="cover-letter-file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e, setCoverLetterFile)}
              style={{ display: 'none' }}
            />
          </div>
        </StaggerItem>

        {status.message && (
          <Popup className={`status-message ${status.type}`} style={{
            marginTop: '10px',
            padding: '16px',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '0.9rem',
            backgroundColor: status.type === 'success' ? 'rgba(209, 231, 221, 0.9)' : 'rgba(248, 215, 218, 0.9)',
            color: status.type === 'success' ? '#0f5132' : '#842029',
            border: status.type === 'success' ? '1px solid #badbcc' : '1px solid #f5c2c7'
          }}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </Popup>
        )}

        <StaggerItem>
          <MotionButton
            className="btn btn-dark"
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '18px', fontSize: '1rem', fontWeight: '800' }}
          >
            {loading ? 'Submitting...' : 'Submit Information'} <Send size={17} style={{ marginLeft: '0.5rem' }} />
          </MotionButton>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
