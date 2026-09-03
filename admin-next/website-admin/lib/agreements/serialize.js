export function serializeAgreement(agreement) {
  if (!agreement) {
    return null;
  }

  const source = typeof agreement.toObject === 'function' ? agreement.toObject() : agreement;

  return {
    ...source,
    _id: String(source._id),
    createdAt: source.createdAt ? new Date(source.createdAt).toISOString() : null,
    updatedAt: source.updatedAt ? new Date(source.updatedAt).toISOString() : null,
    sentAt: source.sentAt ? new Date(source.sentAt).toISOString() : null,
    signedAt: source.signedAt ? new Date(source.signedAt).toISOString() : null,
    lastViewedAt: source.lastViewedAt ? new Date(source.lastViewedAt).toISOString() : null,
    envelopeEvents: Array.isArray(source.envelopeEvents)
      ? source.envelopeEvents.map((event) => ({
          ...event,
          receivedAt: event.receivedAt ? new Date(event.receivedAt).toISOString() : null,
        }))
      : [],
  };
}
