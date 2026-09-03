const STATUS_MAP = {
  created: 'draft',
  draft: 'draft',
  sent: 'sent',
  delivered: 'delivered',
  completed: 'completed',
  declined: 'declined',
  voided: 'voided',
  viewed: 'viewed',
};

export function mapDocuSignEnvelopeStatus(status) {
  return STATUS_MAP[String(status || '').toLowerCase()] || 'draft';
}
