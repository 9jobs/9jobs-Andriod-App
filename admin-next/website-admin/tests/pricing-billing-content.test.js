import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

const root = path.resolve(process.cwd());

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('pricing billing content regression', () => {
  test('updates only the pricing section copy for private weekly and success-based flows', () => {
    const pricingPage = read('app/pricing/page.js');
    const checkoutButton = read('components/PricingCheckoutButton.js');
    const resumePricingSection = read('components/ResumePricingSection.js');

    expect(pricingPage).toContain('AUD $50');
    expect(pricingPage).toContain('/ 2 days');
    expect(pricingPage).toContain('Standard Plan');
    expect(pricingPage).toContain('Request private checkout');
    expect(pricingPage).toContain('Two-Month Success-Based');
    expect(pricingPage).toContain('Request onboarding link');
    expect(pricingPage).toContain('AUD $150');
    expect(pricingPage).toContain('AUD $200');
    expect(checkoutButton).toContain('plan?.action === "contact"');
    expect(checkoutButton).toContain('/api/billing/one-time-checkout');
    expect(resumePricingSection).toContain('PricingCheckoutButton');
    expect(resumePricingSection).toContain('Resume Makeover');
    expect(resumePricingSection).toContain('Resume, LinkedIn & SEEK Optimisation');
  });

  test('adds a personalized billing page with recurring disclosure language', () => {
    const billingPage = read('app/billing/[token]/page.js');

    expect(billingPage).toContain('Secure personalised checkout');
    expect(billingPage).toContain('Charged automatically every week');
    expect(billingPage).toContain('stop future recurring charges');
    expect(billingPage).toContain('Two-Month Success-Based Onboarding');
  });
});
