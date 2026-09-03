'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

const SIGNATURE_FONT_STACK = '"Segoe Script", "Snell Roundhand", "Brush Script MT", "Lucida Handwriting", cursive';
const MAX_SIGNATURE_EXPORT_WIDTH = 560;
const MAX_SIGNATURE_EXPORT_HEIGHT = 180;

export default function SignFortnightAgreementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agreementId = params.id;
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signerContext, setSignerContext] = useState(null);
  
  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Signing States
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [signatureType, setSignatureType] = useState('drawn'); // 'drawn' or 'typed'
  const [signerName, setSignerName] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [submissionState, setSubmissionState] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');

  // Canvas Ref
  const canvasRef = useRef(null);
  const typedCanvasRef = useRef(null);
  const lastDrawPointRef = useRef(null);
  const lastDrawTimeRef = useRef(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Fetch Initial Token Verification Context
  useEffect(() => {
    if (!agreementId || !token) {
      setTimeout(() => {
        setError('Invalid or expired signing link. Missing required token parameter.');
        setLoading(false);
      }, 0);
      return;
    }

    async function fetchContext() {
      try {
        const res = await fetch(`/admin/website-admin/api/fortnight-agreements/${agreementId}/sign?token=${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Access denied: Invalid link.');
        } else {
          setSignerContext(data);
          setSignerName(
            data.signerName || (data.signerRole === 'Client' ? data.clientName : data.providerSignerName || data.providerName)
          );
          setIsOtpVerified(data.isOtpVerified);
          if (data.linkConsumed && data.submissionState) {
            setSubmissionState(data.submissionState);
            setSubmissionMessage(data.submissionMessage || '');
          }
        }
      } catch (err) {
        setError('Connection failed. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    }

    fetchContext();
  }, [agreementId, token]);

  // Handle OTP Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (submissionState !== 'completion_processing') return;

    let cancelled = false;
    const pollCompletion = async () => {
      try {
        const res = await fetch(`/admin/website-admin/api/fortnight-agreements/${agreementId}/sign?token=${token}&status=1`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!res.ok || cancelled) {
          return;
        }

        if (data.status === 'completed') {
          setSubmissionState('completed');
          setSubmissionMessage('A completed copy of the document has been emailed to your registered mailbox.');
          return;
        }

        if (data.status === 'completion_processing_failed') {
          setSubmissionState('completion_processing_failed');
          setSubmissionMessage('Your signature was received, but the completed document is still being processed. Our team has been notified.');
          return;
        }

        if (!cancelled) {
          setTimeout(pollCompletion, 2500);
        }
      } catch {
        if (!cancelled) {
          setTimeout(pollCompletion, 4000);
        }
      }
    };

    const timer = setTimeout(pollCompletion, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [agreementId, submissionState, token]);

  // Canvas Drawing Logic
  useEffect(() => {
    if (!isOtpVerified || signatureType !== 'drawn' || submissionState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOtpVerified, signatureType, submissionState]);

  const getCanvasPoint = (e) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(e);
    if (!point) return;

    if (typeof canvas.setPointerCapture === 'function' && e.pointerId != null) {
      canvas.setPointerCapture(e.pointerId);
    }

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    lastDrawPointRef.current = point;
    lastDrawTimeRef.current = Date.now();
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const point = getCanvasPoint(e);
    if (!point) return;

    const previousPoint = lastDrawPointRef.current || point;
    const now = Date.now();
    const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    const elapsed = Math.max(now - (lastDrawTimeRef.current || now), 1);
    const speed = distance / elapsed;
    const nextWidth = Math.max(1.6, Math.min(3.2, 3.1 - speed * 0.18));
    const midX = (previousPoint.x + point.x) / 2;
    const midY = (previousPoint.y + point.y) / 2;

    ctx.lineWidth = nextWidth;
    ctx.quadraticCurveTo(previousPoint.x, previousPoint.y, midX, midY);
    ctx.stroke();
    lastDrawPointRef.current = point;
    lastDrawTimeRef.current = now;
    setHasDrawnSignature(true);
  };

  const stopDrawing = (e) => {
    if (canvasRef.current && typeof canvasRef.current.releasePointerCapture === 'function' && e?.pointerId != null) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
    lastDrawPointRef.current = null;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastDrawPointRef.current = null;
    setHasDrawnSignature(false);
  };

  const exportCanvasAsSignatureImage = (sourceCanvas) => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = MAX_SIGNATURE_EXPORT_WIDTH;
    exportCanvas.height = MAX_SIGNATURE_EXPORT_HEIGHT;

    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
    return exportCanvas.toDataURL('image/png');
  };

  const buildTypedSignatureImage = async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return '';
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    const canvas = typedCanvasRef.current || document.createElement('canvas');
    const width = MAX_SIGNATURE_EXPORT_WIDTH;
    const height = MAX_SIGNATURE_EXPORT_HEIGHT;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    let fontSize = 72;
    const paddingX = 30;
    const maxTextWidth = width - paddingX * 2;

    ctx.font = `italic ${fontSize}px ${SIGNATURE_FONT_STACK}`;
    while (ctx.measureText(trimmedName).width > maxTextWidth && fontSize > 38) {
      fontSize -= 2;
      ctx.font = `italic ${fontSize}px ${SIGNATURE_FONT_STACK}`;
    }

    const metrics = ctx.measureText(trimmedName);
    const textWidth = Math.min(metrics.width, maxTextWidth);
    const ascent = Math.max(metrics.actualBoundingBoxAscent || fontSize * 0.72, fontSize * 0.72);
    const descent = Math.max(metrics.actualBoundingBoxDescent || fontSize * 0.2, fontSize * 0.2);
    const textHeight = ascent + descent;
    const startX = Math.max((width - textWidth) / 2, paddingX);
    const baselineY = Math.round((height + ascent - descent) / 2);

    ctx.save();
    ctx.translate(startX, baselineY);
    ctx.transform(1, 0, -0.1, 1, 0, 0);
    ctx.fillStyle = '#111827';
    ctx.fillText(trimmedName, 0, 0);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return '';
    }

    const cropPadding = 4;
    const cropX = Math.max(minX - cropPadding, 0);
    const cropY = Math.max(minY - cropPadding, 0);
    const cropWidth = Math.min(maxX - minX + cropPadding * 2 + 1, width - cropX);
    const cropHeight = Math.min(Math.max(maxY - minY + cropPadding * 2 + 1, textHeight + cropPadding * 2), height - cropY);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = cropWidth;
    outputCanvas.height = cropHeight;
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.clearRect(0, 0, cropWidth, cropHeight);
    outputCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return outputCanvas.toDataURL('image/png');
  };

  // Actions
  const handleRequestOtp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/admin/website-admin/api/fortnight-agreements/${agreementId}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', token })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to request code.');
      } else {
        setOtpSent(true);
        setOtpCooldown(60);
      }
    } catch (err) {
      alert('Failed to connect to verification server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpVerifying) return;
    setOtpVerifying(true);
    const otp = otpCode.join('');
    if (otp.length !== 6) {
      alert('Verification code must be 6 digits.');
      setOtpVerifying(false);
      return;
    }

    try {
      const res = await fetch(`/admin/website-admin/api/fortnight-agreements/${agreementId}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', token, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Invalid code.');
      } else {
        setIsOtpVerified(true);
      }
    } catch (err) {
      alert('Verification connection failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleOtpInput = (val, index) => {
    if (isNaN(val)) return;
    const newCode = [...otpCode];
    newCode[index] = val;
    setOtpCode(newCode);

    if (val && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleSubmitSignature = async () => {
    if (submittingSign) return;
    if (!consentAccepted) {
      alert('You must accept the electronic signature consent checkbox.');
      return;
    }
    if (!signerName.trim()) {
      alert('Signature name cannot be empty.');
      return;
    }

    setSubmittingSign(true);
    let signatureImage = '';

    if (signatureType === 'drawn') {
      if (!canvasRef.current) return;
      if (!hasDrawnSignature) {
        alert('Please draw your signature first using the pencil area.');
        setSubmittingSign(false);
        return;
      }
      const canvas = canvasRef.current;
      signatureImage = exportCanvasAsSignatureImage(canvas);
    } else {
      signatureImage = await buildTypedSignatureImage(signerName);
    }

    try {
      const res = await fetch(`/admin/website-admin/api/fortnight-agreements/${agreementId}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_signature',
          token,
          signatureType,
          signatureName: signerName,
          signatureImage,
          consentAccepted
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to submit signature.');
      } else {
        if (data.status === 'completed') {
          setSubmissionState('completed');
          setSubmissionMessage('A completed copy of the document has been emailed to your registered mailbox.');
        } else if (data.status === 'completion_processing') {
          setSubmissionState('completion_processing');
          setSubmissionMessage('We are finalizing the completed agreement now.');
        } else {
          setSubmissionState('client_signed');
          setSubmissionMessage(
            signerContext?.signerRole === 'Client'
              ? 'Your signature has been recorded. The service provider can submit their separate signature from their own secure invitation.'
              : 'Your signature has been recorded. The client can submit their separate signature from their own secure invitation.'
          );
        }
      }
    } catch (err) {
      alert('Connection failed during signature submission.');
    } finally {
      setSubmittingSign(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '15px', color: '#64748b' }}>Securing signing session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>✕</div>
          <h3 style={styles.errorTitle}>Access Denied</h3>
          <p style={styles.errorDescription}>{error}</p>
        </div>
      </div>
    );
  }

  if (submissionState) {
    const isClientSigned = submissionState === 'client_signed';
    const isProviderProcessing = submissionState === 'completion_processing';
    const isCompleted = submissionState === 'completed';
    const isCompletionFailed = submissionState === 'completion_processing_failed';

    return (
      <div style={styles.completedContainer}>
        <div style={styles.completedCard}>
          <div style={styles.completedIcon}>✓</div>
          <h3 style={styles.completedTitle}>
            {isClientSigned && 'Signature Received'}
            {isProviderProcessing && 'Processing your completed agreement...'}
            {isCompleted && 'Agreement Completed'}
            {isCompletionFailed && 'Processing In Progress'}
          </h3>
          <p style={styles.completedDesc}>
            {isClientSigned && `Thank you, ${signerName}. Your signature has been successfully captured.`}
            {isProviderProcessing && `Thank you, ${signerName}. Both signatures were received and the completed agreement is being finalized now.`}
            {isCompleted && `Thank you, ${signerName}. Your signature has been successfully captured and the agreement is now complete.`}
            {isCompletionFailed && `Thank you, ${signerName}. Your signature was received, but the completed document is still being processed.`}
          </p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {submissionMessage}
          </p>
        </div>
      </div>
    );
  }

  // OTP Gate
  if (!isOtpVerified) {
    return (
      <div style={styles.otpContainer}>
        <div style={styles.otpCard}>
          <h3 style={styles.otpTitle}>Security Identity Verification</h3>
          <p style={styles.otpDesc}>
            For security compliance, please verify your identity to access the signing portal for this document.
          </p>

          {!otpSent ? (
            <button onClick={handleRequestOtp} style={styles.btnPrimary}>
              Request Verification Code
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ width: '100%' }}>
              <p style={{ color: '#475569', fontSize: '14px', marginBottom: '15px' }}>
                We sent a 6-digit code to your registered email <strong>{signerContext?.signerEmail}</strong>.
              </p>
              <div style={styles.otpInputRow}>
                {otpCode.map((num, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength="1"
                    value={num}
                    onChange={(e) => handleOtpInput(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    style={styles.otpBox}
                    required
                  />
                ))}
              </div>
              <button type="submit" disabled={otpVerifying} style={styles.btnPrimary}>
                {otpVerifying ? 'Verifying Code...' : 'Verify Code & Access'}
              </button>
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpCooldown > 0}
                  style={otpCooldown > 0 ? styles.btnDisabled : styles.btnText}
                >
                  {otpCooldown > 0 ? `Resend Code (${otpCooldown}s)` : 'Resend Verification Code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.signLayout}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
        * { font-family: 'Outfit', sans-serif; }
      `}</style>
      
      <div style={styles.pdfPanel}>
        <iframe
          src={`/admin/website-admin/api/fortnight-agreements/${agreementId}/preview-original?token=${token}`}
          style={styles.iframe}
          title="Document Preview"
        />
      </div>

      <div style={styles.signPanel}>
        <div style={styles.signCard}>
          <span style={styles.badge}>{signerContext?.signerRole} Session</span>
          
          <div style={{
            backgroundColor: signerContext?.signerRole === 'Client' ? '#eff6ff' : '#f0fdf4',
            border: signerContext?.signerRole === 'Client' ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
            color: signerContext?.signerRole === 'Client' ? '#1e3a8a' : '#15803d',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            marginTop: '12px',
            marginBottom: '15px',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            {signerContext?.signerRole === 'Client' 
              ? `Signing as CLIENT: ${signerContext?.clientName} (${signerContext?.signerEmail})` 
              : `Signing as SERVICE PROVIDER: ${signerContext?.providerSignerName || signerContext?.signerName} (${signerContext?.providerName})`
            }
          </div>

          <h2 style={styles.signTitle}>Review and Sign</h2>
          <p style={styles.signDesc}>
            Please review the document in the preview pane, enter your signature below, and click Submit.
          </p>

          <div style={styles.consentRow}>
            <input
              type="checkbox"
              id="consent-check"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="consent-check" style={styles.checkboxLabel}>
              I have reviewed this agreement and agree to use my electronic signature. I understand that clicking Sign and Submit applies my signature to this agreement.
            </label>
          </div>

          <div style={styles.tabBar}>
            <button
              onClick={() => setSignatureType('drawn')}
              style={signatureType === 'drawn' ? styles.tabActive : styles.tabInactive}
            >
              Draw Signature
            </button>
            <button
              onClick={() => setSignatureType('typed')}
              style={signatureType === 'typed' ? styles.tabActive : styles.tabInactive}
            >
              Type Signature
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={styles.inputLabel}>
              {signerContext?.signerRole === 'Client' ? 'Client Full Legal Name' : 'Service Provider Signer Name'}
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              style={styles.inputField}
              placeholder="Enter your name"
              required
            />
          </div>

          {signatureType === 'drawn' ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.inputLabel}>Draw Signature on Canvas</label>
              <p style={styles.signatureHint}>Use your mouse, finger, or stylus here to sign naturally like a pen.</p>
              <div style={styles.canvasContainer}>
                <div style={styles.canvasPencilBadge} aria-hidden="true">✎</div>
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                  style={styles.canvas}
                />
              </div>
              <button onClick={clearCanvas} style={styles.btnSecondary}>
                Clear Drawing
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: '25px' }}>
              <label style={styles.inputLabel}>Signature Preview</label>
              <div style={styles.typedPreview}>
                {signerName || 'Signature Preview'}
              </div>
              <canvas ref={typedCanvasRef} style={styles.hiddenCanvas} aria-hidden="true" />
            </div>
          )}

          <button
            onClick={handleSubmitSignature}
            disabled={submittingSign}
            style={submittingSign ? styles.btnDisabled : styles.btnPrimary}
          >
            {submittingSign ? 'Submitting Signature...' : 'Sign and Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#090d16',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
  },
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#090d16',
    padding: '20px',
  },
  errorCard: {
    backgroundColor: 'rgba(30, 27, 46, 0.75)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '450px',
    textAlign: 'center',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    backdropFilter: 'blur(12px)',
  },
  errorIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    fontSize: '28px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px auto',
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  errorDescription: {
    color: '#94a3b8',
    fontSize: '15px',
    lineHeight: '1.5',
    margin: 0,
  },
  completedContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#090d16',
    padding: '20px',
  },
  completedCard: {
    backgroundColor: 'rgba(30, 27, 46, 0.75)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '480px',
    textAlign: 'center',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    backdropFilter: 'blur(12px)',
  },
  completedIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    fontSize: '28px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px auto',
  },
  completedTitle: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  completedDesc: {
    color: '#94a3b8',
    fontSize: '15px',
    lineHeight: '1.5',
    margin: '0 0 15px 0',
  },
  otpContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#090d16',
    padding: '20px',
  },
  otpCard: {
    backgroundColor: 'rgba(30, 27, 46, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    backdropFilter: 'blur(12px)',
  },
  otpTitle: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  otpDesc: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 25px 0',
  },
  otpInputRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    margin: '25px 0',
  },
  otpBox: {
    width: '48px',
    height: '52px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'center',
    outline: 'none',
  },
  signLayout: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#090d16',
  },
  pdfPanel: {
    flex: '1',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    height: '100%',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: '#1c1f26',
  },
  signPanel: {
    width: '420px',
    height: '100%',
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  signCard: {
    backgroundColor: 'rgba(30, 27, 46, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)',
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: '4px 10px',
    borderRadius: '100px',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  signTitle: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  signDesc: {
    color: '#94a3b8',
    fontSize: '13.5px',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  consentRow: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
  },
  checkbox: {
    marginTop: '3px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    color: '#cbd5e1',
    fontSize: '12px',
    lineHeight: '1.4',
    cursor: 'pointer',
  },
  tabBar: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '4px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  tabActive: {
    flex: '1',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    border: 'none',
    color: '#ffffff',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'default',
  },
  tabInactive: {
    flex: '1',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  inputLabel: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '12.5px',
    fontWeight: '500',
    marginBottom: '6px',
  },
  inputField: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  signatureHint: {
    color: '#64748b',
    fontSize: '11px',
    margin: '0 0 8px 0',
  },
  canvasContainer: {
    position: 'relative',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    height: '130px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  canvasPencilBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: '#94a3b8',
    fontSize: '16px',
    pointerEvents: 'none',
  },
  canvas: {
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
    touchAction: 'none',
  },
  typedPreview: {
    width: '100%',
    height: '110px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#111827',
    fontSize: '38px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontStyle: 'italic',
    fontFamily: SIGNATURE_FONT_STACK,
    overflow: 'hidden',
    padding: '10px',
    whiteSpace: 'nowrap',
  },
  hiddenCanvas: {
    display: 'none',
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnText: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnDisabled: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'not-allowed',
  },
};
