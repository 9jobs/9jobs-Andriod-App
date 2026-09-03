import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

const root = path.resolve(process.cwd());

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('admin invoices pages', () => {
  test('adds invoice navigation and register page', () => {
    const adminShell = read('components/admin/AdminShell.js');
    const invoicesPage = read('app/admin/invoices/page.js');
    const invoiceDetailPage = read('app/admin/invoices/[id]/page.js');
    const unifiedInvoiceBuilder = read('components/admin/UnifiedInvoiceBuilder.js');
    const invoicePdf = read('lib/invoices/pdf.js');
    const invoiceRegisterActions = read('components/admin/InvoiceRegisterActions.js');
    const invoiceStatusControl = read('components/admin/InvoicePaymentStatusControl.js');

    expect(adminShell).toContain("{ href: '/admin/invoices/new', label: 'Create Invoice', icon: ReceiptText }");
    expect(adminShell).toContain("{ href: '/admin/invoices', label: 'Review Invoice', icon: ReceiptText }");
    expect(adminShell).toContain('href="/admin/invoices/new"');
    expect(invoicesPage).toContain('Invoice Register');
    expect(invoicesPage).toContain('Create Invoice');
    expect(invoicesPage).toContain('invoiceType');
    expect(invoicesPage).toContain('FortnightInvoiceRegisterActions');
    expect(invoicesPage).toContain('InvoiceRegisterActions');
    expect(invoicesPage).toContain('InvoicePaymentStatusControl');
    expect(invoiceRegisterActions).toContain('Edit');
    expect(invoiceRegisterActions).toContain('Delete');
    expect(invoiceRegisterActions).toContain('/admin/invoices/${invoiceId}/edit');
    expect(invoiceStatusControl).toContain('/api/invoices');
    expect(invoiceStatusControl).toContain('/api/fortnight-invoices');
    expect(invoiceStatusControl).toContain('<option value="paid">Paid</option>');
    expect(invoiceStatusControl).toContain('<option value="pending">Pending</option>');
    expect(invoiceDetailPage).toContain('Send Invoice');
    expect(invoiceDetailPage).toContain('Back to list');
    expect(unifiedInvoiceBuilder).toContain('Create Invoice');
    expect(unifiedInvoiceBuilder).toContain('Weekly');
    expect(unifiedInvoiceBuilder).toContain('Fortnight');
    expect(unifiedInvoiceBuilder).toContain('Onboarding Fees');
    expect(unifiedInvoiceBuilder).toContain('Weekly autopay toggle');
    expect(unifiedInvoiceBuilder).toContain('Fortnight autopay toggle');
    expect(unifiedInvoiceBuilder).toContain('On');
    expect(unifiedInvoiceBuilder).toContain('Off');
    expect(invoicePdf).toContain('Invoice No.');
    expect(invoicePdf).not.toContain("drawText(page, '9Jobs'");
    expect(invoicePdf).toContain('PAYMENT DETAILS');
    expect(invoicePdf).toContain('Account Number');
    expect(invoicePdf).toContain('BSB');
    expect(invoicePdf).toContain('cursorY');
    expect(invoicePdf).toContain('TOTAL');
    expect(invoicePdf).toContain('drawRectangle');
    expect(invoicePdf).toContain('Terms & Conditions');
    expect(invoicePdf).toContain('A4_WIDTH');
    expect(invoicePdf).toContain('A4_HEIGHT');
    expect(invoicePdf).toContain('TOP_MARGIN');
    expect(invoicePdf).toContain('SIDE_MARGIN');
    expect(invoicePdf).toContain('headerBarY');
  });
});
