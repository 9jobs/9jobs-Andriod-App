import { sendEmail } from '@/lib/email/delivery';

const ADMIN_MAILBOX = process.env.MAIL_FROM || '9jobsapplicationservice@gmail.com';

export async function sendOtpEmail({ email, name, otp }) {
  await sendEmail({
    to: email,
    subject: '9Jobs Verification Code: ' + otp,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">9Jobs Contract Portal</h2>
        </div>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">Hello ${name},</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">To access the signing session for your 9Jobs contract, please use the following 6-digit verification code:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a; background-color: #f1f5f9; padding: 10px 25px; border-radius: 6px; border: 1px dashed #cbd5e1;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this code, please ignore this email or contact support.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© 2026 9Jobs Pty Ltd. All rights reserved.</p>
      </div>
    `
  });
}

export async function sendClientSigningInvite(agreement, rawToken) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const signingUrl = `${baseUrl}/fortnight-agreements/${agreement._id}/sign?token=${rawToken}`;

  await sendEmail({
    to: agreement.clientEmail,
    subject: 'Signature Required: Your 9Jobs Contract',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">9Jobs Contract Portal</h2>
        </div>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">Dear ${agreement.clientName},</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">You have been sent a contract from 9Jobs for your review and signature. Please click the button below to verify your identity and sign the document.</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${signingUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">Review and Sign Contract</a>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.5;">For security reasons, this signing link is unique to your email and will expire in 48 hours.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© 2026 9Jobs Pty Ltd. All rights reserved.</p>
      </div>
    `
  });
}

export async function sendProviderSigningInvite(agreement, rawToken) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const signingUrl = `${baseUrl}/fortnight-agreements/${agreement._id}/sign?token=${rawToken}`;

  await sendEmail({
    to: agreement.providerEmail,
    subject: 'Signature Required: 9Jobs Contract (' + agreement.clientName + ')',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">9Jobs Contract Portal</h2>
        </div>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">Dear ${agreement.providerName},</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">The client <strong>${agreement.clientName}</strong> has successfully signed the contract. Please click the button below to verify your identity and countersign the document.</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${signingUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">Review and Countersign</a>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This signing link is secure and will expire in 48 hours.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© 2026 9Jobs Pty Ltd. All rights reserved.</p>
      </div>
    `
  });
}

export async function sendAgreementCompletedEmail({ email, name, agreement, pdfBuffer, downloadToken }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  
  const downloadUrl = `${baseUrl}/api/fortnight-agreements/${agreement._id}/download?token=${downloadToken}`;

  const attachments =
    pdfBuffer.length <= 20 * 1024 * 1024
      ? [
          {
            filename: `9jobs-signed-contract-${agreement._id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [];

  await sendEmail({
    to: email,
    subject: 'Contract Completed: 9Jobs & ' + agreement.clientName,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">9Jobs Contract Portal</h2>
        </div>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">Hello ${name},</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.5;">The contract between 9Jobs and <strong>${agreement.clientName}</strong> is now fully signed by both parties.</p>
        ${
          pdfBuffer.length > 20 * 1024 * 1024 
            ? `<p style="font-size: 16px; color: #334155; line-height: 1.5;">Because the document size exceeds the email attachment limit, you can securely download your copy here:</p>
               <div style="text-align: center; margin: 25px 0;">
                 <a href="${downloadUrl}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; display: inline-block;">Download Completed Contract</a>
               </div>`
            : `<p style="font-size: 16px; color: #334155; line-height: 1.5;">A copy of the completed signed PDF is attached to this email for your records.</p>`
        }
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© 2026 9Jobs Pty Ltd. All rights reserved.</p>
      </div>
    `,
    attachments,
  });
}
