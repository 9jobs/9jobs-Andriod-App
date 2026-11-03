const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register');
const express = require('express');
const Stripe = require('stripe');
const { createStripeWebhookRouter } = require('../src/routes/stripeWebhook');
const { createApp } = require('../src/app');

const secret = 'whsec_local_test_only';
let previous;
before(() => {
  previous = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET];
  process.env.STRIPE_SECRET_KEY = 'sk_test_local_only';
  process.env.STRIPE_WEBHOOK_SECRET = secret;
});
after(() => {
  for (const [i, key] of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].entries()) {
    if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
  }
});

const session = (extra = {}) => ({ id: 'cs_test_example', livemode: false,
  payment_status: 'paid', status: 'complete', metadata: { source: '9jobs-mobile-app', planId: 'trial' },
  amount_total: 5000, currency: 'usd', ...extra });
const event = (type = 'checkout.session.completed', extra = {}) => ({
  id: 'evt_local_test', type, created: 1700000000, livemode: false,
  data: { object: { id: 'cs_test_example' } }, ...extra });

async function request(app, payload, { signature, tamper = false, timestamp } = {}) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json' };
    if (signature !== null) headers['stripe-signature'] = signature ?? Stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/stripe/webhook`, {
      method: 'POST', headers, body: body + (tamper ? ' ' : '') });
    return { status: response.status, body: await response.json() };
  } finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
}
function harness(current = session(), save = async () => ({ duplicate: false })) {
  const records = [];
  const app = express();
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), createStripeWebhookRouter({
    retrieveSession: async () => current,
    recordPayment: async value => { records.push(value); return save(value); },
  }));
  return { app, records };
}

test('actual app preserves raw bytes before JSON middleware', async () => {
  const result = await request(createApp(), event('customer.updated'));
  assert.equal(result.status, 200);
  assert.equal(result.body.handled, false);
});
test('missing, invalid, tampered and stale signatures are rejected', async () => {
  const { app, records } = harness();
  for (const options of [{ signature: null }, { signature: 'invalid' }, { tamper: true }, { timestamp: 1 }]) {
    assert.equal((await request(app, event(), options)).status, 400);
  }
  assert.equal(records.length, 0);
});
test('test events cannot reach a live backend', async () => {
  const { app, records } = harness();
  assert.equal((await request(app, event('checkout.session.completed', { livemode: true }))).status, 400);
  assert.equal(records.length, 0);
});
test('paid Checkout is persisted with authoritative Stripe values', async () => {
  const { app, records } = harness();
  assert.equal((await request(app, event())).status, 200);
  assert.equal(records[0].status, 'paid');
  assert.equal(records[0].amountTotal, 5000);
  assert.equal(records[0].planId, 'trial');
});
test('unpaid completed Checkout stays pending', async () => {
  const { app, records } = harness(session({ payment_status: 'unpaid' }));
  await request(app, event());
  assert.equal(records[0].status, 'pending');
});
test('delayed success, failure and expiration preserve actual payment status', async () => {
  for (const [type, current, expected] of [
    ['checkout.session.async_payment_succeeded', session(), 'paid'],
    ['checkout.session.async_payment_failed', session({ payment_status: 'unpaid' }), 'failed'],
    ['checkout.session.expired', session({ payment_status: 'unpaid', status: 'expired' }), 'expired'],
    ['checkout.session.async_payment_failed', session(), 'paid'],
  ]) {
    const { app, records } = harness(current);
    assert.equal((await request(app, event(type))).status, 200);
    assert.equal(records[0].status, expected);
  }
});
test('website and unknown-plan sessions are ignored', async () => {
  for (const metadata of [{ source: 'website', planId: 'trial' }, { source: '9jobs-mobile-app', planId: 'unknown' }]) {
    const { app, records } = harness(session({ metadata }));
    assert.equal((await request(app, event())).body.handled, false);
    assert.equal(records.length, 0);
  }
});
test('duplicate acknowledgement uses durable store result', async () => {
  const { app } = harness(session(), async () => ({ duplicate: true }));
  assert.equal((await request(app, event())).body.duplicate, true);
});
test('storage failure returns 503 so Stripe can retry', async () => {
  const { app } = harness(session(), async () => { throw new Error('database offline'); });
  assert.equal((await request(app, event())).status, 503);
});
test('mismatched Checkout mode is rejected without recording', async () => {
  const { app, records } = harness(session({ livemode: true }));
  assert.equal((await request(app, event())).status, 400);
  assert.equal(records.length, 0);
});

function recurringHarness({ subscriptionStatus = 'active', invoiceStatus = 'paid', failStorage = false, website = false } = {}) {
  const records = [];
  const app = express();
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), createStripeWebhookRouter({
    retrieveSubscription: async id => ({ id, livemode: false, customer: 'cus_fixture',
      status: subscriptionStatus, cancel_at_period_end: subscriptionStatus === 'canceled',
      metadata: { source: website ? 'website' : '9jobs-mobile-app', planId: 'standard' } }),
    retrieveInvoice: async id => ({ id,livemode:false,currency:'aud',amount_paid:invoiceStatus === 'paid' ? 16390 : 0,
      status:invoiceStatus,parent:{subscription_details:{subscription:'sub_fixture'}} }),
    recordSubscription: async value => { if (failStorage) throw new Error('offline'); records.push(value); return {duplicate:false}; },
  }));
  return { app, records };
}
test('renewal payment and failed renewal use authoritative invoice state', async () => {
  for (const [type, invoiceStatus, amount] of [['invoice.paid','paid',16390],['invoice.payment_failed','open',0],['invoice.payment_action_required','open',0]]) {
    const { app, records } = recurringHarness({ invoiceStatus });
    const result = await request(app, event(type,{data:{object:{id:'in_fixture'}}}));
    assert.equal(result.status,200);
    assert.equal(records[0].invoice.amountPaid,amount);
    assert.equal(records[0].invoice.status,invoiceStatus);
  }
});
test('subscription changes and cancellation are persisted', async () => {
  for (const [type, status] of [['customer.subscription.created','active'],['customer.subscription.updated','past_due'],['customer.subscription.deleted','canceled']]) {
    const { app, records } = recurringHarness({ subscriptionStatus:status });
    assert.equal((await request(app,event(type,{data:{object:{id:'sub_fixture'}}}))).status,200);
    assert.equal(records[0].status,status);
  }
});
test('website subscriptions are ignored and storage failures retain retries', async () => {
  const ignored = recurringHarness({ website:true });
  assert.equal((await request(ignored.app,event('invoice.paid',{data:{object:{id:'in_fixture'}}}))).body.handled,false);
  assert.equal(ignored.records.length,0);
  const failed = recurringHarness({ failStorage:true });
  assert.equal((await request(failed.app,event('invoice.paid',{data:{object:{id:'in_fixture'}}}))).status,503);
});
