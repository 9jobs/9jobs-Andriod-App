import crypto from "crypto";
import { Router } from "express";
import Stripe from "stripe";

const router = Router();

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-07-29.dahlia";
const DEFAULT_CURRENCY = "usd";

type SupportedPlanId =
  | "trial"
  | "non-it"
  | "it"
  | "resume-makeover"
  | "resume-linkedin-seek";

const PLAN_CATALOG: Record<
  SupportedPlanId,
  {
    name: string;
    description: string;
    defaultAmount: number;
  }
> = {
  trial: {
    name: "9Jobs Trial",
    description: "2-day 9Jobs trial with resume, LinkedIn, and job application support walkthrough.",
    defaultAmount: 5000,
  },
  "non-it": {
    name: "9Jobs Non-IT Weekly Support",
    description: "Weekly job support plan for non-IT candidates.",
    defaultAmount: 20000,
  },
  it: {
    name: "9Jobs IT Weekly Support",
    description: "Weekly job support plan for IT candidates.",
    defaultAmount: 25000,
  },
  "resume-makeover": {
    name: "9Jobs Resume Makeover",
    description: "One-time ATS-friendly resume makeover service.",
    defaultAmount: 4900,
  },
  "resume-linkedin-seek": {
    name: "9Jobs Resume + LinkedIn + SEEK Optimisation",
    description: "One-time resume, LinkedIn, and SEEK optimisation service.",
    defaultAmount: 8900,
  },
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

function sanitizeAmount(input: unknown, fallbackAmount: number) {
  if (typeof input === "number" && Number.isFinite(input)) {
    const cents = Math.round(input * 100);
    return cents >= 50 ? cents : fallbackAmount;
  }

  if (typeof input === "string") {
    const normalized = Number(String(input).replace(/[^\d.]/g, ""));
    if (Number.isFinite(normalized) && normalized > 0) {
      const cents = Math.round(normalized * 100);
      return cents >= 50 ? cents : fallbackAmount;
    }
  }

  return fallbackAmount;
}

function normalizePlanId(value: unknown): SupportedPlanId | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "trial" ||
    normalized === "non-it" ||
    normalized === "it" ||
    normalized === "resume-makeover" ||
    normalized === "resume-linkedin-seek"
  ) {
    return normalized;
  }
  return null;
}

function buildReturnUrl(pathname: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `ninejobs://${pathname}?${search.toString()}`;
}

router.post("/payments/checkout-session", async (req, res) => {
  const planId = normalizePlanId(req.body?.planId);
  if (!planId) {
    return res.status(400).json({ error: "Invalid or missing planId." });
  }

  const plan = PLAN_CATALOG[planId];
  const amount = sanitizeAmount(req.body?.amount, plan.defaultAmount);
  const customerEmail = typeof req.body?.customerEmail === "string" ? req.body.customerEmail.trim() : "";
  const customerName = typeof req.body?.customerName === "string" ? req.body.customerName.trim() : "";

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: buildReturnUrl("pricing", {
        payment_status: "success",
        session_id: "{CHECKOUT_SESSION_ID}",
      }),
      cancel_url: buildReturnUrl("pricing", {
        payment_status: "cancelled",
      }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: amount,
          },
        },
      ],
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
      amount,
      currency: DEFAULT_CURRENCY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || "",
    });
  } catch (error) {
    console.error("[Payments] Failed to create checkout session:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Could not create checkout session.",
    });
  }
});

router.get("/payments/checkout-session/:sessionId", async (req, res) => {
  const sessionId = String(req.params.sessionId || "").trim();
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId." });
  }

  try {
    const stripe = getStripeClient();
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
    console.error("[Payments] Failed to verify checkout session:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Could not verify checkout session.",
    });
  }
});

export default router;
