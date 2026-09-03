export function serializeFortnightInvoice(invoice) {
  if (!invoice) {
    return null;
  }

  const source = typeof invoice.toObject === 'function' ? invoice.toObject() : invoice;

  return {
    ...source,
    _id: String(source._id),
    createdAt: source.createdAt ? new Date(source.createdAt).toISOString() : null,
    updatedAt: source.updatedAt ? new Date(source.updatedAt).toISOString() : null,
    sentAt: source.sentAt ? new Date(source.sentAt).toISOString() : null,
    paidAt: source.paidAt ? new Date(source.paidAt).toISOString() : null,
    paymentLinkIssuedAt: source.paymentLinkIssuedAt ? new Date(source.paymentLinkIssuedAt).toISOString() : null,
    paymentLinkSentAt: source.paymentLinkSentAt ? new Date(source.paymentLinkSentAt).toISOString() : null,
    currentPeriodEnd: source.currentPeriodEnd ? new Date(source.currentPeriodEnd).toISOString() : null,
    autopayCancelRequestedAt: source.autopayCancelRequestedAt
      ? new Date(source.autopayCancelRequestedAt).toISOString()
      : null,
    autopayCancelledAt: source.autopayCancelledAt ? new Date(source.autopayCancelledAt).toISOString() : null,
  };
}
