# Stripe payment confirmation

The mobile app uses Stripe-hosted Checkout. The backend receives signed Checkout events at
`POST /api/stripe/webhook`, retrieves the authoritative Checkout Session from Stripe, and
records payment status in PostgreSQL. Unpaid sessions remain pending. Database failures return
503 so Stripe can retry; duplicate event IDs are ignored transactionally. Paid records cannot
be downgraded by older events. This ledger does not grant service entitlements automatically.

## Deployment

1. Configure `DATABASE_URL`, `STRIPE_SECRET_KEY`, and `STRIPE_PUBLISHABLE_KEY` as server secrets.
   The Stripe keys must belong to the same account and mode.
2. Run `npm run migrate:stripe` against the target database before enabling event delivery.
3. Deploy the backend. Preserve the existing website's webhook destination.
4. Add a separate destination for the mobile backend URL with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
5. Store that destination's own signing secret as `STRIPE_WEBHOOK_SECRET`, then redeploy.
   A signing secret from another destination will not verify these deliveries.
6. Verify actual Stripe delivery and a database record before declaring confirmation active.

Only sessions tagged `source=9jobs-mobile-app` with a recognized plan are recorded.
No card data or raw Stripe event payload is stored. Both tables have RLS enabled and are
accessed only through the backend database connection.

## Validation

`node tests/stripeWebhook.test.cjs` runs signature, raw-body mounting, payment-state,
mode, unrelated-session, duplicate acknowledgement and storage-failure checks using fixtures.
These tests do not charge a card or prove a real database migration or Stripe delivery.

## Screenshot pricing

All new checkouts use server-controlled AUD prices, with the account's active Australian
exclusive 10% GST rate. Trial is $49 for 2 days, Standard is $149 recurring every week,
Premium is $1,499 once for 2 months, Resume Makeover is $49 once, and the combined
Resume/LinkedIn/SEEK package is $89 once. Customer-supplied amounts are ignored.
Older `non-it`/`it` identifiers map to Standard/Premium. Existing Stripe prices and
subscriptions are not modified. Subscription metadata identifies mobile-originated renewals;
invoice and subscription lifecycle events are stored separately from initial Checkout records.
