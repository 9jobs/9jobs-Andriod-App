export function serializeInvoice(invoice) {
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
    paymentLinkSentAt: source.paymentLinkSentAt ? new Date(source.paymentLinkSentAt).toISOString() : null,
  };
}
