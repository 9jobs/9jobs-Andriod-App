import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

const root = path.resolve(process.cwd());

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('invoice edit page', () => {
  test('reuses the invoice form in edit mode', () => {
    const editPage = read('app/admin/invoices/[id]/edit/page.js');
    const invoiceForm = read('components/admin/InvoiceForm.js');

    expect(editPage).toContain('Edit Invoice');
    expect(editPage).toContain('<InvoiceForm');
    expect(editPage).toContain('mode="edit"');
    expect(invoiceForm).toContain('initialValues');
    expect(invoiceForm).toContain('mode = \'create\'');
    expect(invoiceForm).toContain("method: mode === 'edit' ? 'PATCH' : 'POST'");
  });
});
