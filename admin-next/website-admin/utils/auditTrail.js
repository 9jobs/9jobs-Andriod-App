import crypto from 'node:crypto';

/**
 * Masks an IP address (IPv4 or IPv6) for privacy compliance.
 * @param {string} ip 
 * @returns {string}
 */
export function maskIp(ip) {
  if (!ip) return 'unknown';
  if (ip === '::1' || ip === '127.0.0.1') return 'localhost';
  
  if (ip.includes('.')) {
    // IPv4 masking (e.g. 192.168.1.15 -> 192.168.1.xxx)
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  } else if (ip.includes(':')) {
    // IPv6 masking (e.g. 2001:db8:85a3::8a2e:370:7334 -> 2001:db8:85a3::xxxx:xxxx)
    const parts = ip.split(':');
    if (parts.length >= 3) {
      parts[parts.length - 1] = 'xxxx';
      if (parts[parts.length - 2]) {
        parts[parts.length - 2] = 'xxxx';
      }
      return parts.join(':');
    }
  }
  return ip;
}

/**
 * Generates the complete audit trail JSON structure, hashes it with SHA-256,
 * and returns it as a stringified Buffer.
 * 
 * @param {Object} agreement Mongoose agreement document
 * @returns {{ buffer: Buffer, hash: string }}
 */
export function generateAuditTrail(agreement) {
  const auditData = {
    schemaVersion: "1.0",
    timezone: "UTC",
    agreement: {
      id: String(agreement._id),
      clientName: agreement.clientName,
      clientEmail: agreement.clientEmail,
      providerName: agreement.providerName,
      providerEmail: agreement.providerEmail,
    },
    documentIntegrity: {
      originalPdfSha256: agreement.originalPdfSha256,
      signedPdfSha256: agreement.signedPdfSha256,
    },
    signatures: {
      client: {
        role: "Client",
        name: agreement.clientSignature.name,
        email: agreement.clientEmail,
        viewedAt: agreement.clientDocumentViewedAt ? agreement.clientDocumentViewedAt.toISOString() : null,
        otpVerifiedAt: agreement.clientOtpVerifiedAt ? agreement.clientOtpVerifiedAt.toISOString() : null,
        consentAcceptedAt: agreement.clientConsentAcceptedAt ? agreement.clientConsentAcceptedAt.toISOString() : null,
        signedAt: agreement.clientSignature.signedAt ? agreement.clientSignature.signedAt.toISOString() : null,
        signatureType: agreement.clientSignature.signatureType,
        ipAddress: maskIp(agreement.clientSignature.ip),
        userAgent: agreement.clientSignature.userAgent,
      },
      provider: {
        role: "Service Provider",
        name: agreement.providerSignature.name,
        email: agreement.providerEmail,
        viewedAt: agreement.providerDocumentViewedAt ? agreement.providerDocumentViewedAt.toISOString() : null,
        otpVerifiedAt: agreement.providerOtpVerifiedAt ? agreement.providerOtpVerifiedAt.toISOString() : null,
        consentAcceptedAt: agreement.providerConsentAcceptedAt ? agreement.providerConsentAcceptedAt.toISOString() : null,
        signedAt: agreement.providerSignature.signedAt ? agreement.providerSignature.signedAt.toISOString() : null,
        signatureType: agreement.providerSignature.signatureType,
        ipAddress: maskIp(agreement.providerSignature.ip),
        userAgent: agreement.providerSignature.userAgent,
      }
    },
    completionTimestamp: agreement.completedAt ? agreement.completedAt.toISOString() : new Date().toISOString()
  };

  // Compute a SHA-256 hash over the sorted stringified content for audit integrity
  const serialized = JSON.stringify(auditData, Object.keys(auditData).sort());
  const auditTrailSha256 = crypto.createHash('sha256').update(serialized).digest('hex');

  // Insert the hash inside the final output
  const finalAuditRecord = {
    ...auditData,
    auditRecordSha256: auditTrailSha256
  };

  const buffer = Buffer.from(JSON.stringify(finalAuditRecord, null, 2), 'utf-8');

  return {
    buffer,
    hash: auditTrailSha256
  };
}
