import { Router } from "express";
import Stripe from "stripe";
import { recordStripeCheckout, recordStripeSubscription, type ConfirmedCheckout, type ConfirmedSubscription } from "../services/stripePaymentStore";
import { normalizePlanId } from "../services/pricingCatalog";

type Dependencies = {
  retrieveSession: (id: string) => Promise<Stripe.Checkout.Session>;
  recordPayment: (payment: ConfirmedCheckout) => Promise<{ duplicate: boolean }>;
  retrieveSubscription: (id: string) => Promise<Stripe.Subscription>;
  retrieveInvoice: (id: string) => Promise<Stripe.Invoice>;
  recordSubscription: (value: ConfirmedSubscription) => Promise<{ duplicate: boolean }>;
};
const checkoutEvents = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired"]);
const subscriptionEvents = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]);
const invoiceEvents = new Set(["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required"]);

export function createStripeWebhookRouter(overrides: Partial<Dependencies> = {}) {
  const router = Router();
  const retrieveSession = overrides.retrieveSession ?? (async (id: string) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" });
    return stripe.checkout.sessions.retrieve(id);
  });
  const recordPayment = overrides.recordPayment ?? recordStripeCheckout;
  const stripeClient = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" });
  const retrieveSubscription = overrides.retrieveSubscription ?? (async (id: string) => stripeClient().subscriptions.retrieve(id));
  const retrieveInvoice = overrides.retrieveInvoice ?? (async (id: string) => stripeClient().invoices.retrieve(id));
  const recordSubscription = overrides.recordSubscription ?? recordStripeSubscription;

  router.post("/", async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret || !apiKey) return res.status(503).json({ error: "Webhook is not configured" });
    const signature = req.get("stripe-signature");
    if (!signature || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: "Invalid webhook request" });
    let event: Stripe.Event;
    try { event = Stripe.webhooks.constructEvent(req.body, signature, secret); }
    catch { return res.status(400).json({ error: "Invalid webhook signature" }); }
    const live = /^(sk|rk)_live_/.test(apiKey);
    if (event.livemode !== live) return res.status(400).json({ error: "Webhook mode mismatch" });
    if (!checkoutEvents.has(event.type) && !subscriptionEvents.has(event.type) && !invoiceEvents.has(event.type)) return res.json({ received: true, handled: false });
    try {
      if (subscriptionEvents.has(event.type) || invoiceEvents.has(event.type)) {
        let invoice: Stripe.Invoice | undefined;
        let subscriptionId: string;
        if (invoiceEvents.has(event.type)) {
          const incoming = event.data.object as Stripe.Invoice;
          if (!incoming.id?.startsWith("in_")) return res.status(400).json({ error: "Invalid invoice event" });
          invoice = await retrieveInvoice(incoming.id);
          const subscription = invoice.parent?.subscription_details?.subscription;
          if (!subscription) return res.json({ received: true, handled: false });
          subscriptionId = typeof subscription === "string" ? subscription : subscription.id;
        } else {
          subscriptionId = (event.data.object as Stripe.Subscription).id;
        }
        if (!subscriptionId?.startsWith("sub_")) return res.status(400).json({ error: "Invalid subscription event" });
        const subscription = await retrieveSubscription(subscriptionId);
        if (subscription.livemode !== live || (invoice && invoice.livemode !== live)) return res.status(400).json({ error: "Subscription mode mismatch" });
        if (subscription.metadata.source !== "9jobs-mobile-app" || subscription.metadata.planId !== "standard") {
          return res.json({ received: true, handled: false });
        }
        const result = await recordSubscription({
          eventId: event.id,eventType:event.type,eventCreated:event.created,
          subscriptionId: subscription.id,customerId:typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
          planId: "standard",livemode:subscription.livemode,status:subscription.status,
          cancelAtPeriodEnd:subscription.cancel_at_period_end,
          ...(invoice ? { invoice: { id:invoice.id,amountPaid:invoice.amount_paid,currency:invoice.currency,status:invoice.status ?? "draft" } } : {}),
        });
        return res.json({ received:true,handled:true,duplicate:result.duplicate });
      }
      const incoming = event.data.object as Stripe.Checkout.Session;
      if (!incoming.id?.startsWith("cs_")) return res.status(400).json({ error: "Invalid checkout event" });
      // Read authoritative state from Stripe instead of trusting a redirect or a stale event.
      const session = await retrieveSession(incoming.id);
      if (session.livemode !== live) return res.status(400).json({ error: "Checkout mode mismatch" });
      if (session.metadata?.source !== "9jobs-mobile-app" || !normalizePlanId(session.metadata?.planId)) {
        return res.json({ received: true, handled: false });
      }
      const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      const status: ConfirmedCheckout["status"] = paid ? "paid"
        : event.type === "checkout.session.async_payment_failed" ? "failed"
        : session.status === "expired" ? "expired" : "pending";
      const result = await recordPayment({
        eventId: event.id, eventType: event.type, eventCreated: event.created, sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
        planId: session.metadata.planId, amountTotal: session.amount_total ?? 0, currency: session.currency ?? "usd",
        livemode: session.livemode, status,
      });
      return res.json({ received: true, handled: true, duplicate: result.duplicate });
    } catch {
      // Non-2xx keeps Stripe retries active; never acknowledge an unpersisted payment.
      console.error("[Stripe Webhook] Payment processing failed", { eventId: event.id, eventType: event.type });
      return res.status(503).json({ error: "Payment confirmation temporarily unavailable" });
    }
  });
  return router;
}

export default createStripeWebhookRouter();
