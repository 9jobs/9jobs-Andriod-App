import { describe, expect, test } from '@jest/globals';

import { LOCKED_INVOICE_PAYMENT_DETAILS } from '@/lib/invoices/defaults';
import { generateInvoicePdfBuffer } from '@/lib/invoices/pdf';

describe('invoice pdf', () => {
  test('generates a branded PDF buffer for invoice preview and email attachment', async () => {
    const buffer = await generateInvoicePdfBuffer({
      invoiceNumber: '9J-202607-017',
      invoiceDate: '2026-07-01',
      billedToName: 'Neetu Sharma',
      billedToEmail: 'sharmamelbourne91@gmail.com',
      billedToPhone: '+61 421 803 703',
      weekLabel: '1',
      issuedDate: '2026-07-01',
      validUntil: '2026-07-07',
      dueDate: '2026-07-02',
      description: 'Job Application Services',
      duration: '1 WEEK',
      total: '150',
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
    expect(LOCKED_INVOICE_PAYMENT_DETAILS.accountNumber).toBe('970362192');
    expect(LOCKED_INVOICE_PAYMENT_DETAILS.bsb).toBe('083004');
  });
});
