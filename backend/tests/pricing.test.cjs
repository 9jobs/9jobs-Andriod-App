const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register');
const { buildPricingCheckout, normalizePlanId } = require('../src/services/pricingCatalog');
const express = require('express');
const { createPaymentsRouter } = require('../src/routes/payments');

test('all screenshot plans have fixed AUD prices and exclusive GST', () => {
  for (const [id, amount] of [['trial',4900],['standard',14900],['premium',149900],['resume-makeover',4900],['resume-linkedin-seek',8900]]) {
    const params = buildPricingCheckout(id, 'txr_fixture');
    const item = params.line_items[0];
    assert.equal(item.price_data.unit_amount, amount);
    assert.equal(item.price_data.currency, 'aud');
    assert.equal(item.price_data.tax_behavior, 'exclusive');
    assert.deepEqual(item.tax_rates, ['txr_fixture']);
    assert.equal(params.mode, id === 'standard' ? 'subscription' : 'payment');
    if (id === 'standard') {
      assert.deepEqual(item.price_data.recurring, { interval: 'week' });
      assert.equal(params.subscription_data.metadata.source, '9jobs-mobile-app');
      assert.equal(params.subscription_data.metadata.planId, 'standard');
    } else assert.equal(item.price_data.recurring, undefined);
  }
});
test('checkout API ignores a tampered client amount and sends exact weekly price and tax to Stripe', async () => {
  let checkout;
  const app = express();
  app.use(express.json());
  app.use('/api',createPaymentsRouter(() => ({
    taxRates:{list:async () => ({data:[{id:'txr_fixture',percentage:10,inclusive:false,country:'AU',display_name:'GST'}]})},
    checkout:{sessions:{create:async params => { checkout=params;return {id:'cs_fixture',url:'https://checkout.stripe.com/fixture'}; }}},
  })));
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/checkout-session`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({planId:'standard',amount:'0.50'}),
    });
    assert.equal(response.status,200);
    const result = await response.json();
    assert.equal(result.amount,16390);
    assert.equal(result.subtotal,14900);
    assert.equal(result.gst,1490);
    assert.equal(result.currency,'aud');
    assert.equal(checkout.mode,'subscription');
    assert.equal(checkout.line_items[0].price_data.unit_amount,14900);
    assert.equal(checkout.metadata.planId,'standard');
    assert.equal(checkout.metadata.source,'9jobs-mobile-app');
    assert.match(checkout.success_url,/ninejobs:\/\/pricing\?payment_status=success/);
  } finally { await new Promise(resolve => { server.close(resolve);server.closeAllConnections(); }); }
});
test('old clients map to replacement plans; invalid plans and missing GST fail closed', () => {
  assert.equal(normalizePlanId('non-it'), 'standard');
  assert.equal(normalizePlanId('it'), 'premium');
  assert.equal(normalizePlanId('__proto__'), null);
  assert.equal(normalizePlanId('random'), null);
  assert.throws(() => buildPricingCheckout('trial', ''), /GST/);
});
