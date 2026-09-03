import { generateInvoicePdfBuffer } from '@/lib/invoices/pdf';
import { applyFortnightInvoiceDefaults } from '@/lib/fortnight-invoices/defaults';

export async function generateFortnightInvoicePdfBuffer(invoice) {
  const invoiceData = applyFortnightInvoiceDefaults(invoice);
  const termLabel = String(invoiceData.monthLabel || '').trim() || '1 Month';
  const isUpfront =
    String(invoiceData.description || '').toLowerCase().includes('onboarding') ||
    String(invoiceData.duration || '').toLowerCase().includes('upfront') ||
    String(invoiceData.duration || '').toLowerCase().includes('one time');
  const normalizedTermLabel =
    termLabel.toLowerCase() === 'week'
      ? 'Week'
      : /^\d+$/.test(termLabel)
        ? `${termLabel} ${termLabel === '1' ? 'Month' : 'Months'}`
        : termLabel;

  return generateInvoicePdfBuffer({
    ...invoiceData,
    weekLabel: invoiceData.monthLabel,
    periodLabel: 'Month',
    periodSuffix: 'MONTH',
    planNoteHeading: 'Note',
    planNoteBody: isUpfront
      ? 'This invoice is for the 9Jobs onboarding fee and is processed as a one-time payment only. No recurring autopay applies to this invoice.'
      : `This invoice is for the 9Jobs Fortnight Plan (${normalizedTermLabel}). It records the selected service term and should be retained for billing and service reference.`,
  });
}
