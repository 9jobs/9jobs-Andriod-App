import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

const root = path.resolve(process.cwd());

describe('admin dashboard invoice metrics', () => {
  test('escapes dollar-sign literals in revenue aggregation', () => {
    const dashboardPage = fs.readFileSync(path.join(root, 'app/admin/dashboard/page.js'), 'utf8');

    expect(dashboardPage).toContain("find: { $literal: '$' }");
    expect(dashboardPage).toContain("amount: { $sum: buildNumericAmountExpression('$total') }");
  });
});
