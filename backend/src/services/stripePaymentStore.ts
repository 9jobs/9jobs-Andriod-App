import { Pool } from "pg";

export type ConfirmedCheckout = {
  eventId: string; eventType: string; eventCreated: number; sessionId: string;
  paymentIntentId: string | null; customerId: string | null; customerEmail: string | null;
  planId: string; amountTotal: number; currency: string; livemode: boolean;
  status: "pending" | "paid" | "failed" | "expired";
};

export const stripePaymentSchema = `
create table if not exists stripe_webhook_events (
  event_id text primary key, session_id text not null, event_type text not null,
  livemode boolean not null, processed_at timestamptz not null default now()
);
create table if not exists stripe_checkout_payments (
  session_id text primary key, payment_intent_id text, customer_id text, customer_email text,
  plan_id text not null, amount_total bigint not null check (amount_total >= 0), currency text not null,
  livemode boolean not null, status text not null check (status in ('pending','paid','failed','expired')),
  last_event_created bigint not null, updated_at timestamptz not null default now()
);
alter table stripe_webhook_events enable row level security;
alter table stripe_checkout_payments enable row level security;
create table if not exists stripe_subscription_states (
  subscription_id text primary key, customer_id text, plan_id text not null,
  livemode boolean not null, status text not null, cancel_at_period_end boolean not null,
  last_event_created bigint not null, updated_at timestamptz not null default now()
);
create table if not exists stripe_subscription_invoices (
  invoice_id text primary key, subscription_id text not null, amount_paid bigint not null,
  currency text not null, status text not null, updated_at timestamptz not null default now()
);
alter table stripe_subscription_states enable row level security;
alter table stripe_subscription_invoices enable row level security;
`;

let pool: Pool | undefined;
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Payment database is not configured");
  if (pool) return pool;
  pool = new Pool({ connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: true } : undefined,
    max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, statement_timeout: 5000,
  });
  pool.on("error", () => console.error("[Stripe Webhook] Payment database connection lost"));
  return pool;
}

export type ConfirmedSubscription = {
  eventId: string; eventType: string; eventCreated: number;
  subscriptionId: string; customerId: string | null; planId: string; livemode: boolean;
  status: string; cancelAtPeriodEnd: boolean;
  invoice?: { id: string; amountPaid: number; currency: string; status: string };
};

export async function recordStripeSubscription(value: ConfirmedSubscription): Promise<{ duplicate: boolean }> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const event = await client.query(
      `insert into stripe_webhook_events (event_id,session_id,event_type,livemode) values ($1,$2,$3,$4)
       on conflict (event_id) do nothing returning event_id`,
      [value.eventId, value.subscriptionId, value.eventType, value.livemode],
    );
    if (event.rowCount === 0) { await client.query("commit"); return { duplicate: true }; }
    await client.query(
      `insert into stripe_subscription_states
       (subscription_id,customer_id,plan_id,livemode,status,cancel_at_period_end,last_event_created)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (subscription_id) do update set status=excluded.status,
         cancel_at_period_end=excluded.cancel_at_period_end, last_event_created=excluded.last_event_created,updated_at=now()
       where excluded.last_event_created >= stripe_subscription_states.last_event_created`,
      [value.subscriptionId,value.customerId,value.planId,value.livemode,value.status,value.cancelAtPeriodEnd,value.eventCreated],
    );
    if (value.invoice) await client.query(
      `insert into stripe_subscription_invoices (invoice_id,subscription_id,amount_paid,currency,status)
       values ($1,$2,$3,$4,$5) on conflict (invoice_id) do update set
         amount_paid=excluded.amount_paid,status=excluded.status,updated_at=now()
       where stripe_subscription_invoices.status <> 'paid'`,
      [value.invoice.id,value.subscriptionId,value.invoice.amountPaid,value.invoice.currency,value.invoice.status],
    );
    await client.query("commit");
    return { duplicate: false };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function migrateStripePaymentStore() {
  const db = getPool();
  try { await db.query(stripePaymentSchema); } finally { await db.end(); pool = undefined; }
}

export async function recordStripeCheckout(payment: ConfirmedCheckout): Promise<{ duplicate: boolean }> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const event = await client.query(
      `insert into stripe_webhook_events (event_id,session_id,event_type,livemode) values ($1,$2,$3,$4)
       on conflict (event_id) do nothing returning event_id`,
      [payment.eventId, payment.sessionId, payment.eventType, payment.livemode],
    );
    if (event.rowCount === 0) { await client.query("commit"); return { duplicate: true }; }
    await client.query(
      `insert into stripe_checkout_payments
       (session_id,payment_intent_id,customer_id,customer_email,plan_id,amount_total,currency,livemode,status,last_event_created)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (session_id) do update set
         payment_intent_id=excluded.payment_intent_id, customer_id=excluded.customer_id,
         customer_email=excluded.customer_email, amount_total=excluded.amount_total,
         status=excluded.status, last_event_created=excluded.last_event_created, updated_at=now()
       where stripe_checkout_payments.status <> 'paid'
         and (excluded.status='paid' or excluded.last_event_created >= stripe_checkout_payments.last_event_created)`,
      [payment.sessionId,payment.paymentIntentId,payment.customerId,payment.customerEmail,payment.planId,
        payment.amountTotal,payment.currency,payment.livemode,payment.status,payment.eventCreated],
    );
    await client.query("commit");
    return { duplicate: false };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}
