import crypto from "crypto";
import { Router } from "express";
import Stripe from "stripe";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-07-29.dahlia";
const DEFAULT_CURRENCY = "aud";

import { buildPricingCheckout, normalizePlanId, pricingCatalog } from "../services/pricingCatalog";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

async function getGstRateId(stripe: Stripe) {
  const rates = await stripe.taxRates.list({ active: true, limit: 100 });
  const rate = rates.data.find(rate => rate.percentage === 10 && !rate.inclusive
    && rate.country === "AU" && rate.display_name.toUpperCase() === "GST");
  if (!rate) throw new Error("Australian GST rate is not configured");
  return rate.id;
}

function buildReturnUrl(pathname: string, params: Record<string, string>) {
  const search = Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = value === "{CHECKOUT_SESSION_ID}"
        ? value
        : encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${encodedValue}`;
    })
    .join("&");

  return `ninejobs://${pathname}?${search}`;
}

export function createPaymentsRouter(clientFactory = getStripeClient) {
const router = Router();
router.post("/payments/checkout-session", async (req, res) => {
  const planId = normalizePlanId(req.body?.planId);
  if (!planId) {
    return res.status(400).json({ error: "Invalid or missing planId." });
  }

  const plan = pricingCatalog[planId];
  const amount = plan.amount;
  const customerEmail = typeof req.body?.customerEmail === "string" ? req.body.customerEmail.trim() : "";
  const customerName = typeof req.body?.customerName === "string" ? req.body.customerName.trim() : "";

  try {
    const stripe = clientFactory();
    const session = await stripe.checkout.sessions.create({
      ...buildPricingCheckout(planId, await getGstRateId(stripe)),
      success_url: buildReturnUrl("pricing", {
        payment_status: "success",
        session_id: "{CHECKOUT_SESSION_ID}",
      }),
      cancel_url: buildReturnUrl("pricing", {
        payment_status: "cancelled",
      }),
      customer_email: customerEmail || undefined,
      metadata: {
        planId,
        customerName,
        source: "9jobs-mobile-app",
      },
      integration_identifier: `9jobs_mobile_${crypto.randomBytes(4).toString("hex")}`,
    });

    return res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: amount + Math.round(amount * 0.1),
      subtotal: amount,
      gst: Math.round(amount * 0.1),
      currency: DEFAULT_CURRENCY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || "",
    });
  } catch (error) {
    console.error("[Payments] Failed to create checkout session");
    return res.status(500).json({
      error: "Could not create checkout session. Please try again or contact 9Jobs support.",
    });
  }
});

router.get("/payments/checkout-session/:sessionId", async (req, res) => {
  const sessionId = String(req.params.sessionId || "").trim();
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId." });
  }

  try {
    const stripe = clientFactory();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email || session.customer_email || "",
        amount_total: session.amount_total ?? 0,
        currency: session.currency || DEFAULT_CURRENCY,
        metadata: session.metadata || {},
      },
    });
  } catch (error) {
    console.error("[Payments] Failed to verify checkout session");
    return res.status(500).json({
      error: "Could not verify checkout session.",
    });
  }
});

return router;
}
export default createPaymentsRouter();
