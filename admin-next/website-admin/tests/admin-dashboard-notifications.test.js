import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

const root = path.resolve(process.cwd());

describe('admin dashboard notifications', () => {
  test('uses short notification copy for invoices and client signatures', () => {
    const dashboardPage = fs.readFileSync(path.join(root, 'app/admin/dashboard/page.js'), 'utf8');

    expect(dashboardPage).toContain("message: `${clientName} payment successful.`");
    expect(dashboardPage).toContain("message: `${record.clientName} signed successfully.`");
    expect(dashboardPage).toContain("title: 'Signed Successfully'");
    expect(dashboardPage).toContain('key: `client-signed:');
    expect(dashboardPage).not.toContain('deduped.length >= MAX_NOTIFICATIONS');
  });
});
