import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

import connectMongoDB from '@/lib/mongodb';
import AdminUser from '@/models/AdminUser';
import { createPasswordResetToken, hashPasswordResetToken } from '@/lib/admin/auth/password-reset';

const ADMIN_MAILBOX = '9jobsapplicationservice@gmail.com';

function buildAuthError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toSafeAdmin(adminUser) {
  return {
    id: String(adminUser._id),
    email: adminUser.email,
    name: adminUser.name,
  };
}

async function getAdminTransporter() {
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailPass) {
    throw buildAuthError('Password reset email is not configured.', 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: ADMIN_MAILBOX,
      pass: gmailPass,
    },
  });
}

async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const transporter = await getAdminTransporter();

  await transporter.sendMail({
    from: '"9Jobs Admin Access" <9jobsapplicationservice@gmail.com>',
    to: email,
    subject: 'Reset your 9Jobs admin password',
    html: `
      <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 18px;">
        <p style="display:inline-block; padding:8px 14px; border-radius:999px; background:#d9ff5f; font-weight:700;">9Jobs Admin</p>
        <h1 style="font-size:28px; margin:20px 0 12px;">Reset your password</h1>
        <p style="line-height:1.7; color:#334155;">Hi ${name}, we received a request to reset your 9Jobs admin password.</p>
        <p style="line-height:1.7; color:#334155;">Use the secure link below within 30 minutes:</p>
        <p style="margin:28px 0;">
          <a href="${resetUrl}" style="display:inline-block; padding:14px 22px; border-radius:999px; background:#111111; color:#ffffff; text-decoration:none; font-weight:700;">Reset Password</a>
        </p>
        <p style="line-height:1.7; color:#64748b;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function hasRegisteredAdmins() {
  await connectMongoDB();
  const count = await AdminUser.countDocuments({});
  return count > 0;
}

export async function createInitialAdminUser({ name, email, password }) {
  await connectMongoDB();

  const existingCount = await AdminUser.countDocuments({});

  if (existingCount > 0) {
    throw buildAuthError('Admin registration is closed.', 'ADMIN_SIGNUP_DISABLED');
  }

  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 12);

  const adminUser = await AdminUser.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    lastLoginAt: new Date(),
  });

  return toSafeAdmin(adminUser);
}

export async function authenticateAdminUser({ email, password }) {
  await connectMongoDB();
  const normalizedEmail = normalizeEmail(email);

  let adminUser = await AdminUser.findOne({
    email: normalizedEmail,
  });

  if (!adminUser && normalizedEmail === ADMIN_MAILBOX) {
    const existingCount = await AdminUser.countDocuments({});

    if (existingCount === 1) {
      adminUser = await AdminUser.findOne({});
    }
  }

  if (!adminUser) {
    return null;
  }

  const isValid = await bcrypt.compare(password, adminUser.passwordHash);

  if (!isValid) {
    return null;
  }

  adminUser.lastLoginAt = new Date();
  await adminUser.save();

  return toSafeAdmin(adminUser);
}

export async function requestAdminPasswordReset({ email, appUrl }) {
  await connectMongoDB();

  const adminUser = await AdminUser.findOne({
    email: normalizeEmail(email),
  });

  if (!adminUser) {
    return { success: true };
  }

  const reset = createPasswordResetToken();

  adminUser.passwordResetTokenHash = reset.tokenHash;
  adminUser.passwordResetExpiresAt = reset.expiresAt;
  adminUser.passwordResetRequestedAt = new Date();
  await adminUser.save();

  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(reset.token)}`;

  await sendPasswordResetEmail({
    email: adminUser.email,
    name: adminUser.name,
    resetUrl,
  });

  return { success: true };
}

export async function resetAdminPassword({ token, password }) {
  await connectMongoDB();

  const adminUser = await AdminUser.findOne({
    passwordResetTokenHash: hashPasswordResetToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!adminUser) {
    return null;
  }

  adminUser.passwordHash = await bcrypt.hash(password, 12);
  adminUser.passwordResetTokenHash = '';
  adminUser.passwordResetExpiresAt = null;
  adminUser.passwordResetRequestedAt = null;
  adminUser.lastLoginAt = new Date();
  await adminUser.save();

  return toSafeAdmin(adminUser);
}
