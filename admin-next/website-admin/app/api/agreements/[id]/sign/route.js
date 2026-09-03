import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Agreement from '@/models/Agreement';
import { 
  hashToken, 
  hashOtp, 
  constantTimeCompare, 
  generateOtp
} from '@/utils/cryptoUtils';
import { sanitizeAndReencodePng } from '@/utils/pngUtils';
import { isRateLimited } from '@/utils/rateLimiter';
import { uploadPrivatePdf } from '@/lib/storage/blob';
import { 
  sendOtpEmail
} from '@/lib/agreements/email';
import { executeFinalSealing } from '@/lib/agreements/completion';

export const dynamic = 'force-dynamic';

function getReadOnlySigningState({ isClient, status }) {
  if (isClient && status === 'client_signed') {
    return {
      submissionState: 'client_signed',
      submissionMessage: 'Your signature has been recorded. The service provider can submit their separate signature from their own secure invitation.',
    };
  }

  if (!isClient && status === 'sent_to_client') {
    return {
      submissionState: 'client_signed',
      submissionMessage: 'Your signature has been recorded. The client can submit their separate signature from their own secure invitation.',
    };
  }

  if (status === 'completion_processing') {
    return {
      submissionState: 'completion_processing',
      submissionMessage: 'We are finalizing the completed agreement now.',
    };
  }

  if (status === 'completed') {
    return {
      submissionState: 'completed',
      submissionMessage: 'A completed copy of the document has been emailed to your registered mailbox.',
    };
  }

  if (status === 'completion_processing_failed') {
    return {
      submissionState: 'completion_processing_failed',
      submissionMessage: 'Your signature was received, but the completed document is still being processed. Our team has been notified.',
    };
  }

  return null;
}

/**
 * GET: Validates the token and returns signer context (names, email, OTP verification state)
 * without exposing sensitive signatures, tokens, or private PDF URLs.
 */
export async function GET(request, { params }) {
  await connectDB();
  const id = (await params).id;
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get('token') || '';
  const statusPoll = searchParams.get('status') === '1';

  if (!rawToken) {
    return NextResponse.json({ error: 'Missing token parameter.' }, { status: 400 });
  }

  const tokenHash = hashToken(rawToken);

  // Rate Limiting on signing portal access (max 20 per minute per IP)
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (await isRateLimited(`ip:${clientIp}:sign-page-access`, 20, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const agreement = await Agreement.findOne({
    _id: id,
    $or: [
      { clientSigningTokenHash: tokenHash },
      { providerSigningTokenHash: tokenHash }
    ]
  });

  if (!agreement) {
    return NextResponse.json({ error: 'Invalid link or agreement not found.' }, { status: 401 });
  }

  const isClient = constantTimeCompare(agreement.clientSigningTokenHash, tokenHash);
  const expiry = isClient ? agreement.clientTokenExpiresAt : agreement.providerTokenExpiresAt;
  const usedAt = isClient ? agreement.clientTokenUsedAt : agreement.providerTokenUsedAt;

  if (statusPoll) {
    return NextResponse.json({
      agreementId: String(agreement._id),
      signerRole: isClient ? 'Client' : 'Provider',
      status: agreement.status,
      isCompleted: agreement.status === 'completed',
      isCompletionFailed: agreement.status === 'completion_processing_failed',
      isProcessingCompletion: agreement.status === 'completion_processing',
      hasProviderBeenInvited: Boolean(agreement.providerInvitationSentAt),
    });
  }

  if (usedAt) {
    const readOnlyState = getReadOnlySigningState({ isClient, status: agreement.status });

    if (readOnlyState) {
      return NextResponse.json({
        agreementId: String(agreement._id),
        clientName: agreement.clientName,
        providerName: agreement.providerName,
        providerSignerName: agreement.providerSignatureName,
        signerRole: isClient ? 'Client' : 'Provider',
        signerEmail: isClient ? agreement.clientEmail : agreement.providerEmail,
        signerName: isClient ? agreement.clientName : agreement.providerSignatureName,
        isOtpVerified: true,
        linkConsumed: true,
        ...readOnlyState,
      });
    }

    return NextResponse.json({ error: 'This signing link has already been used.' }, { status: 403 });
  }

  if (new Date() > expiry) {
    return NextResponse.json({ error: 'This signing link has expired.' }, { status: 403 });
  }

  // Each party signs independently using their own secure invitation.
  if (!['sent_to_client', 'client_signed'].includes(agreement.status)) {
    return NextResponse.json({ error: 'Agreement is not in a signable state.' }, { status: 403 });
  }

  const otpVerifiedAt = isClient ? agreement.clientOtpVerifiedAt : agreement.providerOtpVerifiedAt;

  return NextResponse.json({
    agreementId: String(agreement._id),
    clientName: agreement.clientName,
    providerName: agreement.providerName,
    providerSignerName: agreement.providerSignatureName,
    signerRole: isClient ? 'Client' : 'Provider',
    signerEmail: isClient ? agreement.clientEmail : agreement.providerEmail,
    signerName: isClient ? agreement.clientName : agreement.providerSignatureName,
    isOtpVerified: Boolean(otpVerifiedAt),
  });
}

/**
 * POST: Handles signing actions (OTP generation, OTP verification, signature submission)
 */
export async function POST(request, { params }) {
  await connectDB();
  const id = (await params).id;
  
  const body = await request.json().catch(() => ({}));
  const { action, token: rawToken } = body;

  if (!rawToken || !action) {
    return NextResponse.json({ error: 'Missing token or action.' }, { status: 400 });
  }

  const tokenHash = hashToken(rawToken);

  // Securely resolve signer from hashed token
  const agreement = await Agreement.findOne({
    _id: id,
    $or: [
      { clientSigningTokenHash: tokenHash },
      { providerSigningTokenHash: tokenHash }
    ]
  });

  if (!agreement) {
    return NextResponse.json({ error: 'Access denied: Invalid token.' }, { status: 401 });
  }

  const isClient = constantTimeCompare(agreement.clientSigningTokenHash, tokenHash);
  const email = isClient ? agreement.clientEmail : agreement.providerEmail;
  const name = isClient ? agreement.clientName : agreement.providerSignatureName;
  const tokenUsedAt = isClient ? agreement.clientTokenUsedAt : agreement.providerTokenUsedAt;
  const tokenExpiresAt = isClient ? agreement.clientTokenExpiresAt : agreement.providerTokenExpiresAt;

  // Verify token constraints
  if (tokenUsedAt) {
    return NextResponse.json({ error: 'Access denied: Token already used.' }, { status: 403 });
  }
  if (new Date() > tokenExpiresAt) {
    return NextResponse.json({ error: 'Access denied: Token expired.' }, { status: 403 });
  }

  // Client and service-provider links are independently authorized.
  if (!['sent_to_client', 'client_signed'].includes(agreement.status)) {
    return NextResponse.json({ error: 'Access denied: Out of sequence.' }, { status: 403 });
  }

  // Get Client IP and UA
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // -------------------------------------------------------------
  // ACTION: REQUEST_OTP
  // -------------------------------------------------------------
  if (action === 'request_otp') {
    const cooldownField = isClient ? 'clientOtpCooldownUntil' : 'providerOtpCooldownUntil';
    if (agreement[cooldownField] && new Date() < agreement[cooldownField]) {
      return NextResponse.json({ error: 'Resend cooldown active. Please wait 60 seconds.' }, { status: 429 });
    }

    // Scope the quota to this signing link. Cooldown re-clicks are rejected above
    // and must not consume the signer's hourly allowance.
    const signerRole = isClient ? 'client' : 'provider';
    if (await isRateLimited(`agreement:${id}:${signerRole}:request-otp:${tokenHash}:v3`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many verification codes requested for this agreement. Please wait and try again.' }, { status: 429 });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Save hashed OTP, expiry, and reset attempts atomically
    if (isClient) {
      agreement.clientOtpHash = otpHash;
      agreement.clientOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      agreement.clientOtpAttempts = 0;
      agreement.clientOtpCooldownUntil = new Date(Date.now() + 60 * 1000); // 60s resend cooldown
    } else {
      agreement.providerOtpHash = otpHash;
      agreement.providerOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      agreement.providerOtpAttempts = 0;
      agreement.providerOtpCooldownUntil = new Date(Date.now() + 60 * 1000);
    }
    await agreement.save();

    try {
      await sendOtpEmail({ email, name, otp });
    } catch (err) {
      console.error('Failed to send OTP email:', err);
      return NextResponse.json({ error: 'Failed to deliver verification code. Please check SMTP configuration.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verification code sent successfully.' });
  }

  // -------------------------------------------------------------
  // ACTION: VERIFY_OTP
  // -------------------------------------------------------------
  if (action === 'verify_otp') {
    const { otp } = body;
    if (!otp) {
      return NextResponse.json({ error: 'Missing verification code.' }, { status: 400 });
    }

    // Rate Limiting (max 10 attempts per 15 minutes per email)
    if (await isRateLimited(`email:${email}:verify-otp`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Account locked for 15 minutes.' }, { status: 429 });
    }

    const otpHash = isClient ? agreement.clientOtpHash : agreement.providerOtpHash;
    const otpExpiresAt = isClient ? agreement.clientOtpExpiresAt : agreement.providerOtpExpiresAt;
    const attemptsField = isClient ? 'clientOtpAttempts' : 'providerOtpAttempts';

    if (agreement[attemptsField] >= 3) {
      return NextResponse.json({ error: 'Verification code blocked: Exceeded 3 maximum attempts. Please request a new code.' }, { status: 400 });
    }

    if (!otpHash || new Date() > otpExpiresAt) {
      return NextResponse.json({ error: 'Verification code has expired or is invalid.' }, { status: 400 });
    }

    // Increment attempts atomically
    agreement[attemptsField] += 1;
    await agreement.save();

    const hashedInput = hashOtp(otp);
    if (!constantTimeCompare(otpHash, hashedInput)) {
      return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 400 });
    }

    // OTP Verified Successfully!
    if (isClient) {
      agreement.clientOtpVerifiedAt = new Date();
    } else {
      agreement.providerOtpVerifiedAt = new Date();
    }
    await agreement.save();

    return NextResponse.json({ success: true, message: 'Verification code validated successfully.' });
  }

  // -------------------------------------------------------------
  // ACTION: SUBMIT_SIGNATURE
  // -------------------------------------------------------------
  if (action === 'submit_signature') {
    const { signatureType, signatureName, signatureImage, consentAccepted } = body;

    // 1. Validate Consent Checkbox
    if (!consentAccepted) {
      return NextResponse.json({ error: 'Consent is mandatory: You must agree to use electronic signature.' }, { status: 400 });
    }

    // 2. Validate OTP is verified
    const otpVerifiedAt = isClient ? agreement.clientOtpVerifiedAt : agreement.providerOtpVerifiedAt;
    if (!otpVerifiedAt) {
      return NextResponse.json({ error: 'Access denied: Verification code must be validated first.' }, { status: 403 });
    }

    // Rate limit only real submission attempts after the basic validation passes.
    if (await isRateLimited(`token:${tokenHash}:submit-signature`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many submission retries. Please wait.' }, { status: 429 });
    }

    let signatureFileKey = '';

    // 3. Process submitted signature PNG when provided. Typed signatures may
    // fall back to text-only for backward compatibility with direct API callers.
    if (signatureType === 'drawn' || (signatureType === 'typed' && signatureImage)) {
      if (!signatureImage || !signatureImage.startsWith('data:image/png;base64,')) {
        return NextResponse.json({ error: 'Invalid signature image. Signature must be submitted as PNG.' }, { status: 400 });
      }

      const base64Data = signatureImage.substring(signatureImage.indexOf(',') + 1);
      const rawImageBuffer = Buffer.from(base64Data, 'base64');

      let sanitizedImageBuffer;
      try {
        // Enforce strict PNG validation, dimensions, and re-encoding server-side
        sanitizedImageBuffer = sanitizeAndReencodePng(rawImageBuffer);
      } catch (err) {
        return NextResponse.json({ error: `Signature validation failed: ${err.message}` }, { status: 400 });
      }

      // Upload to private storage for final PDF sealing
      try {
        const upload = await uploadPrivatePdf({
          folder: `signatures/${agreement._id}`,
          fileName: `temp-${isClient ? 'client' : 'provider'}-sig.png`,
          buffer: sanitizedImageBuffer,
          contentType: 'image/png',
        });
        signatureFileKey = upload.path; // Stored securely as path key
      } catch (err) {
        console.error('Failed to upload signature PNG:', err);
        return NextResponse.json({ error: 'Failed to upload signature image to private storage.' }, { status: 500 });
      }
    }

    // 4. Save this party's signature. Tokens are role-bound, so neither party
    // can sign the other party's field.
    const signerFields = isClient
      ? {
          clientTokenUsedAt: new Date(),
          clientConsentAcceptedAt: new Date(),
          'clientSignature.name': signatureName || agreement.clientName,
          'clientSignature.ip': ip,
          'clientSignature.userAgent': userAgent,
          'clientSignature.signedAt': new Date(),
          'clientSignature.signatureFileKey': signatureFileKey,
          'clientSignature.signatureType': signatureType,
          status: 'client_signed',
        }
      : {
          providerTokenUsedAt: new Date(),
          providerConsentAcceptedAt: new Date(),
          'providerSignature.name': signatureName || agreement.providerSignatureName,
          'providerSignature.ip': ip,
          'providerSignature.userAgent': userAgent,
          'providerSignature.signedAt': new Date(),
          'providerSignature.signatureFileKey': signatureFileKey,
          'providerSignature.signatureType': signatureType,
        };

    let updatedAgreement;
    if (isClient) {
      updatedAgreement = await Agreement.findOneAndUpdate(
        { _id: id, status: 'sent_to_client', clientTokenUsedAt: null },
        { $set: signerFields },
        { new: true }
      );
    } else {
      // Prefer the client-signed state first. This prevents a concurrent
      // provider submission from overwriting a newly recorded client status.
      updatedAgreement = await Agreement.findOneAndUpdate(
        { _id: id, status: 'client_signed', providerTokenUsedAt: null },
        { $set: { ...signerFields, status: 'completion_processing' } },
        { new: true }
      );

      if (!updatedAgreement) {
        updatedAgreement = await Agreement.findOneAndUpdate(
          { _id: id, status: 'sent_to_client', providerTokenUsedAt: null },
          { $set: { ...signerFields, status: 'sent_to_client' } },
          { new: true }
        );
      }

      if (!updatedAgreement) {
        updatedAgreement = await Agreement.findOneAndUpdate(
          { _id: id, status: 'client_signed', providerTokenUsedAt: null },
          { $set: { ...signerFields, status: 'completion_processing' } },
          { new: true }
        );
      }
    }

    if (!updatedAgreement) {
      return NextResponse.json({ error: 'Submission conflict: Signature already processed.' }, { status: 409 });
    }

    // A client submission must become visible to Admin immediately. Once both
    // independently captured signatures exist, atomically begin final sealing.
    if (
      updatedAgreement.status !== 'completion_processing' &&
      updatedAgreement.clientSignature?.signedAt &&
      updatedAgreement.providerSignature?.signedAt
    ) {
      updatedAgreement = await Agreement.findOneAndUpdate(
        {
          _id: id,
          status: 'client_signed',
          'clientSignature.signedAt': { $ne: null },
          'providerSignature.signedAt': { $ne: null },
        },
        { $set: { status: 'completion_processing' } },
        { new: true }
      );
    }

    if (updatedAgreement?.status === 'completion_processing') {
      try {
        const finalizedAgreement = await executeFinalSealing(updatedAgreement);
        if (finalizedAgreement?.status === 'completed') {
          return NextResponse.json({ success: true, status: 'completed', message: 'Agreement completed successfully.' });
        }
      } catch (err) {
        console.error('Final sealing execution failed:', err);
      }

      return NextResponse.json({
        success: true,
        status: 'completion_processing',
        message: 'Both signatures were received. Document sealing is processing.',
      });
    }

    return NextResponse.json({
      success: true,
      status: isClient ? 'client_signed' : 'sent_to_client',
      message: isClient
        ? 'Client signature saved. The service provider can sign from their separate invitation.'
        : 'Service provider signature saved. The client can sign from their separate invitation.',
    });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
