import bcrypt from 'bcryptjs';

export async function verifyAdminCredentials({ email, password }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail) {
    return false;
  }

  const emailMatches = email.trim().toLowerCase() === adminEmail.trim().toLowerCase();

  if (!emailMatches) {
    return false;
  }

  if (!adminPasswordHash) {
    return false;
  }

  return bcrypt.compare(password, adminPasswordHash);
}
