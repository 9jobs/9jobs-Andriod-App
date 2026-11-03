import type Stripe from "stripe";

export const pricingCatalog = {
  trial: { name: "Trial Plan", amount: 4900, description: "Experience our complete job application process with no commitment.", recurring: false },
  standard: { name: "Standard Plan", amount: 14900, description: "100+ Job Applications / Week. Just A$1.49 per application (before GST).", recurring: true },
  premium: { name: "Premium Plan", amount: 149900, description: "Everything managed for your job search. One-time payment for 2 months.", recurring: false },
  "resume-makeover": { name: "Resume Makeover", amount: 4900, description: "Professional resume redesign tailored for ATS systems to get you noticed.", recurring: false },
  "resume-linkedin-seek": { name: "Resume, LinkedIn & SEEK Optimisation", amount: 8900, description: "Complete professional branding to boost your Resume, LinkedIn, and SEEK profile visibility.", recurring: false },
} as const;

export type SupportedPlanId = keyof typeof pricingCatalog;
export function normalizePlanId(value: unknown): SupportedPlanId | null {
  const id = String(value || "").trim().toLowerCase();
  // Older installed clients can still open the replacement plans.
  if (id === "non-it") return "standard";
  if (id === "it") return "premium";
  return Object.prototype.hasOwnProperty.call(pricingCatalog, id) ? id as SupportedPlanId : null;
}

export function buildPricingCheckout(planId: SupportedPlanId, taxRateId: string): Pick<Stripe.Checkout.SessionCreateParams, "mode" | "line_items" | "subscription_data"> {
  if (!taxRateId.startsWith("txr_")) throw new Error("GST rate is not configured");
  const plan = pricingCatalog[planId];
  return {
    mode: plan.recurring ? "subscription" : "payment",
    line_items: [{ quantity: 1, tax_rates: [taxRateId], price_data: {
      currency: "aud", unit_amount: plan.amount, tax_behavior: "exclusive",
      product_data: { name: `9Jobs ${plan.name}`, description: plan.description },
      ...(plan.recurring ? { recurring: { interval: "week" as const } } : {}),
    } }],
    ...(plan.recurring ? { subscription_data: { metadata: { planId, source: "9jobs-mobile-app" } } } : {}),
  };
}
