import connectDB from '@/utils/db';
import ClientInfo from '@/models/ClientInfo';
import BillingWebhookEvent from '@/models/BillingWebhookEvent';
import {
  createInvoice,
  generateAndStoreInvoicePdf,
  getInvoiceDocumentById,
  markInvoiceCheckoutExpiredFromStripe,
  markInvoicePaidFromStripe,
  markInvoicePaymentFailedFromStripe,
  suggestNextInvoiceDetails,
} from '@/lib/invoices/service';
import {
  markFortnightInvoicePaidFromStripe,
  markFortnightInvoicePaymentFailedFromStripe,
  markFortnightInvoiceRenewalFailedFromStripe,
  markFortnightInvoiceRenewalPaidFromStripe,
  markFortnightInvoiceSubscriptionUpdatedFromStripe,
} from '@/lib/fortnight-invoices/service';
import { generateSecureToken, hashToken, constantTimeCompare } from '@/utils/cryptoUtils';
import { getStripeClient } from '@/lib/billing/stripe';
import { getHostedCheckoutCustomerCaptureConfig } from '@/lib/billing/checkout';
import {
  BILLING_STATES,
  BILLING_PLAN_TYPES,
  DEFAULT_WEEKLY_TERMS_VERSION,
  ONE_TIME_CHECKOUT_PLANS,
  SUCCESS_FEE_DEFAULT_DESCRIPTION,
} from '@/lib/billing/constants';

function getBaseUrl(origin = '') {
  const normalizedOrigin = String(origin || '').replace(/\/$/, '');

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)) {
    return normalizedOrigin;
  }

  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    normalizedOrigin ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function buildWeeklyDisclosure(amountLabel) {
  return `${amountLabel} is due today. By completing this payment, you subscribe to the 9Jobs Standard Weekly Job Support Plan and authorise ${amountLabel} to be charged automatically every week until the subscription is cancelled in accordance with the service agreement.`;
}

function pushAuditEntry(clientDocument, entry) {
  clientDocument.billing.auditLog.push({
    type: entry.type || 'event',
    message: entry.message || '',
    actor: entry.actor || '',
    source: entry.source || '',
    metadata: entry.metadata || {},
    createdAt: new Date(),
  });
}

function formatCurrencyLabel(amountCents, currency = 'aud') {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((amountCents || 0) / 100);
}

export function getClientBillingSummary(client) {
  const billing = client?.billing || {};
  const currency = billing.currency || 'aud';
  const weeklyAmountLabel = billing.agreedWeeklyAmountCents
    ? formatCurrencyLabel(billing.agreedWeeklyAmountCents, currency)
    : '';

  return {
    planType: billing.planType || BILLING_PLAN_TYPES.NONE,
    planLabel: billing.planLabel || '',
    billingState: billing.billingState || BILLING_STATES.PENDING_AGREEMENT,
    agreedWeeklyAmountCents: billing.agreedWeeklyAmountCents || 0,
    weeklyAmountLabel,
    onboardingFeeCents: billing.onboardingFeeCents || 0,
    onboardingFeeLabel: billing.onboardingFeeCents ? formatCurrencyLabel(billing.onboardingFeeCents, currency) : '',
    latestSuccessFeeAmountCents: billing.latestSuccessFeeAmountCents || 0,
    latestSuccessFeeAmountLabel: billing.latestSuccessFeeAmountCents ? formatCurrencyLabel(billing.latestSuccessFeeAmountCents, currency) : '',
    currency,
    billingFrequency: billing.billingFrequency || 'week',
    agreementId: billing.agreementId || '',
    agreementUrl: billing.agreementUrl || '',
    agreementStatus: billing.agreementStatus || '',
    checkoutTermsVersion: billing.checkoutTermsVersion || DEFAULT_WEEKLY_TERMS_VERSION,
    checkoutDisclosureText: billing.checkoutDisclosureText || '',
    cancellationPolicy: billing.cancellationPolicy || 'period_end',
    subscriptionAuthorisationStatus: billing.subscriptionAuthorisationStatus || 'inactive',
    stripeCustomerId: billing.stripeCustomerId || '',
    stripeSubscriptionId: billing.stripeSubscriptionId || '',
    checkoutSessionId: billing.checkoutSessionId || '',
    currentPeriodEnd: billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toISOString() : null,
    cancelAtPeriodEnd: Boolean(billing.cancelAtPeriodEnd),
    cancelRequestedAt: billing.cancelRequestedAt ? new Date(billing.cancelRequestedAt).toISOString() : null,
    cancelledAt: billing.cancelledAt ? new Date(billing.cancelledAt).toISOString() : null,
    authorisedAt: billing.authorisedAt ? new Date(billing.authorisedAt).toISOString() : null,
    customerPortalLastOpenedAt: billing.customerPortalLastOpenedAt ? new Date(billing.customerPortalLastOpenedAt).toISOString() : null,
    successFeeInvoiceId: billing.successFeeInvoiceId || '',
    successFeeCheckoutSessionId: billing.successFeeCheckoutSessionId || '',
    auditLog: Array.isArray(billing.auditLog) ? billing.auditLog.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : null,
    })) : [],
  };
}

export async function getBillingClientById(clientId) {
  await connectDB();
  return ClientInfo.findById(clientId);
}

export async function getBillingClientSummaryById(clientId) {
  const client = await getBillingClientById(clientId);
  if (!client) {
    return null;
  }

  return {
    _id: String(client._id),
    fullName: client.fullName,
    email: client.email,
    billing: getClientBillingSummary(client),
  };
}

export async function generateBillingLinkForClient(clientId, actor = 'admin', origin = '') {
  await connectDB();
  const client = await ClientInfo.findById(clientId);

  if (!client) {
    throw new Error('Client not found.');
  }

  if (!client.billing || client.billing.planType === BILLING_PLAN_TYPES.NONE) {
    throw new Error('Select a billing plan before generating a private checkout link.');
  }

  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  client.billing.paymentPageTokenHash = tokenHash;
  client.billing.paymentPageTokenIssuedAt = now;
  client.billing.paymentPageTokenExpiresAt = expiresAt;
  client.billing.paymentPageLastSentAt = now;
  client.billing.checkoutTermsVersion = client.billing.checkoutTermsVersion || DEFAULT_WEEKLY_TERMS_VERSION;

  if (client.billing.planType === BILLING_PLAN_TYPES.STANDARD_WEEKLY && client.billing.agreedWeeklyAmountCents > 0) {
    client.billing.checkoutDisclosureText = buildWeeklyDisclosure(
      formatCurrencyLabel(client.billing.agreedWeeklyAmountCents, client.billing.currency || 'aud')
    );
  }

  pushAuditEntry(client, {
    type: 'billing_link_generated',
    message: 'Generated a private billing link.',
    actor,
    source: 'admin',
  });

  await client.save();

  return {
    token,
    url: `${getBaseUrl(origin)}/billing/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function findClientByBillingToken(token) {
  await connectDB();
  const tokenHash = hashToken(token);
  const client = await ClientInfo.findOne({ 'billing.paymentPageTokenHash': tokenHash });

  if (!client) {
    return null;
  }

  const expiresAt = client.billing?.paymentPageTokenExpiresAt;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return null;
  }

  if (!constantTimeCompare(client.billing.paymentPageTokenHash || '', tokenHash)) {
    return null;
  }

  return client;
}

async function ensureStripeCustomer(clientDocument) {
  const stripe = getStripeClient();

  if (clientDocument.billing.stripeCustomerId) {
    return clientDocument.billing.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: clientDocument.email,
    name: clientDocument.fullName,
    metadata: {
      client_id: String(clientDocument._id),
      billing_plan_type: clientDocument.billing.planType || BILLING_PLAN_TYPES.NONE,
    },
  });

  clientDocument.billing.stripeCustomerId = customer.id;
  return customer.id;
}

function extractRequestContext(request) {
  return {
    ip: request?.headers?.get?.('x-forwarded-for') || '',
    userAgent: request?.headers?.get?.('user-agent') || '',
  };
}

export async function createWeeklySubscriptionCheckout({ token, request, origin = '' }) {
  const client = await findClientByBillingToken(token);
  if (!client) {
    throw new Error('This billing link is invalid or expired.');
  }

  if (client.billing.planType !== BILLING_PLAN_TYPES.STANDARD_WEEKLY) {
    throw new Error('This client is not configured for the weekly subscription flow.');
  }

  if (!client.billing.agreedWeeklyAmountCents) {
    throw new Error('A negotiated weekly amount is required before checkout.');
  }

  const stripe = getStripeClient();
  const stripeCustomerId = await ensureStripeCustomer(client);
  const amountCents = client.billing.agreedWeeklyAmountCents;
  const amountLabel = formatCurrencyLabel(amountCents, client.billing.currency || 'aud');
  const baseUrl = getBaseUrl(origin);
  const requestContext = extractRequestContext(request);

  const session = await stripe.checkout.sessions.create({
    ...getHostedCheckoutCustomerCaptureConfig(),
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: String(client._id),
    line_items: [
      {
        price_data: {
          currency: client.billing.currency || 'aud',
          unit_amount: amountCents,
          recurring: {
            interval: 'week',
          },
          product_data: {
            name: '9Jobs Standard Weekly Job Support',
            description: `${amountLabel} due today, then ${amountLabel} every week until cancelled.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      client_id: String(client._id),
      plan_type: BILLING_PLAN_TYPES.STANDARD_WEEKLY,
      agreement_id: client.billing.agreementId || '',
      terms_version: client.billing.checkoutTermsVersion || DEFAULT_WEEKLY_TERMS_VERSION,
      agreed_weekly_amount_cents: String(amountCents),
    },
    subscription_data: {
      metadata: {
        client_id: String(client._id),
        terms_version: client.billing.checkoutTermsVersion || DEFAULT_WEEKLY_TERMS_VERSION,
      },
    },
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&billing=weekly`,
    cancel_url: `${baseUrl}/billing/${token}`,
  });

  client.billing.billingState = BILLING_STATES.PENDING_CHECKOUT;
  client.billing.checkoutSessionId = session.id;
  client.billing.checkoutDisclosureText = buildWeeklyDisclosure(amountLabel);
  client.billing.consentIp = requestContext.ip;
  client.billing.consentUserAgent = requestContext.userAgent;
  pushAuditEntry(client, {
    type: 'checkout_session_created',
    message: 'Created Stripe subscription checkout session.',
    actor: client.email,
    source: 'client',
    metadata: {
      checkoutSessionId: session.id,
      amountCents,
    },
  });
  await client.save();

  return session;
}

async function createGenericOneTimeCheckout({ planName, amountCents, currency = 'aud', description, metadata = {}, origin = '' }) {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(origin);

  return stripe.checkout.sessions.create({
    ...getHostedCheckoutCustomerCaptureConfig(),
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: `9Jobs ${planName}`,
            description,
          },
        },
        quantity: 1,
      },
    ],
    client_reference_id: metadata.client_id || undefined,
    metadata,
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&billing=one-time`,
    cancel_url: `${baseUrl}/pricing`,
  });
}

export async function createOneTimePlanCheckout({ planName, origin = '' }) {
  const plan = ONE_TIME_CHECKOUT_PLANS[planName];

  if (!plan) {
    throw new Error('Unsupported checkout plan.');
  }

  return createGenericOneTimeCheckout({
    planName: `${planName} Plan`,
    amountCents: plan.unitAmount,
    currency: plan.currency,
    description: plan.description,
    metadata: {
      plan_name: planName,
      plan_type: 'public_one_time',
    },
    origin,
  });
}

export async function createSuccessBasedOnboardingCheckout({ token, origin = '' }) {
  const client = await findClientByBillingToken(token);
  if (!client) {
    throw new Error('This billing link is invalid or expired.');
  }

  if (client.billing.planType !== BILLING_PLAN_TYPES.SUCCESS_BASED) {
    throw new Error('This client is not configured for the success-based onboarding flow.');
  }

  const onboardingFeeCents = client.billing.onboardingFeeCents || 20000;
  const stripeCustomerId = await ensureStripeCustomer(client);
  const session = await createGenericOneTimeCheckout({
    planName: 'Two-Month Success-Based Onboarding',
    amountCents: onboardingFeeCents,
    currency: client.billing.currency || 'aud',
    description: `Personalised onboarding fee of ${formatCurrencyLabel(onboardingFeeCents, client.billing.currency || 'aud')}.`,
    metadata: {
      client_id: String(client._id),
      plan_type: BILLING_PLAN_TYPES.SUCCESS_BASED,
      agreement_id: client.billing.agreementId || '',
      onboarding_fee_cents: String(onboardingFeeCents),
      stripe_customer_id: stripeCustomerId,
    },
    origin,
  });

  client.billing.billingState = BILLING_STATES.PENDING_CHECKOUT;
  client.billing.checkoutSessionId = session.id;
  pushAuditEntry(client, {
    type: 'checkout_session_created',
    message: 'Created success-based onboarding checkout session.',
    actor: client.email,
    source: 'client',
    metadata: {
      checkoutSessionId: session.id,
      amountCents: onboardingFeeCents,
    },
  });
  await client.save();

  return session;
}

async function resolveClientForPrivilegedBillingAction(clientId) {
  const client = await getBillingClientById(clientId);
  if (!client) {
    throw new Error('Client not found.');
  }

  return client;
}

export async function createCustomerPortalSession({ clientId, origin = '' }) {
  const client = await resolveClientForPrivilegedBillingAction(clientId);

  if (!client.billing?.stripeCustomerId) {
    throw new Error('No Stripe customer is linked to this client yet.');
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: client.billing.stripeCustomerId,
    return_url: `${getBaseUrl(origin)}/admin/client-information`,
  });

  client.billing.customerPortalLastOpenedAt = new Date();
  pushAuditEntry(client, {
    type: 'customer_portal_opened',
    message: 'Created Stripe customer portal session.',
    actor: 'admin',
    source: 'admin',
    metadata: {
      portalUrl: session.url,
    },
  });
  await client.save();

  return session;
}

export async function cancelClientSubscription({ clientId, actor = 'admin' }) {
  const client = await resolveClientForPrivilegedBillingAction(clientId);

  if (!client.billing?.stripeSubscriptionId) {
    throw new Error('No active Stripe subscription is linked to this client.');
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.update(client.billing.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  client.billing.billingState = BILLING_STATES.CANCEL_AT_PERIOD_END;
  client.billing.cancelAtPeriodEnd = true;
  client.billing.cancelRequestedAt = new Date();
  client.billing.currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : client.billing.currentPeriodEnd;
  pushAuditEntry(client, {
    type: 'subscription_cancel_requested',
    message: 'Marked subscription to cancel at period end.',
    actor,
    source: 'admin',
    metadata: {
      subscriptionId: subscription.id,
      currentPeriodEnd: client.billing.currentPeriodEnd,
    },
  });
  await client.save();

  return subscription;
}

export async function createSuccessFeeCheckout({ clientId, amountCents, actor = 'admin', origin = '' }) {
  const client = await resolveClientForPrivilegedBillingAction(clientId);
  const parsedAmount = Number(amountCents);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error('A positive success-fee amount is required.');
  }

  const invoiceDefaults = await suggestNextInvoiceDetails();
  const invoice = await createInvoice({
    ...invoiceDefaults,
    billedToName: client.fullName,
    billedToEmail: client.email,
    billedToPhone: client.contactNo || '',
    weekLabel: 'SUCCESS',
    description: SUCCESS_FEE_DEFAULT_DESCRIPTION,
    duration: 'ONE TIME',
    total: (parsedAmount / 100).toFixed(2),
  });
  const invoiceDocument = await getInvoiceDocumentById(invoice._id);
  if (invoiceDocument) {
    await generateAndStoreInvoicePdf(invoiceDocument);
  }

  const stripeCustomerId = await ensureStripeCustomer(client);
  const session = await createGenericOneTimeCheckout({
    planName: 'Success Fee',
    amountCents: parsedAmount,
    currency: client.billing.currency || 'aud',
    description: `Success fee of ${formatCurrencyLabel(parsedAmount, client.billing.currency || 'aud')}.`,
    metadata: {
      client_id: String(client._id),
      plan_type: 'success_fee',
      success_fee_invoice_id: String(invoice._id),
      stripe_customer_id: stripeCustomerId,
      amount_cents: String(parsedAmount),
    },
    origin,
  });

  client.billing.latestSuccessFeeAmountCents = parsedAmount;
  client.billing.successFeeInvoiceId = String(invoice._id);
  client.billing.successFeeCheckoutSessionId = session.id;
  client.billing.billingState = BILLING_STATES.SUCCESS_FEE_DUE;
  pushAuditEntry(client, {
    type: 'success_fee_created',
    message: 'Created success-fee invoice and checkout session.',
    actor,
    source: 'admin',
    metadata: {
      invoiceId: String(invoice._id),
      checkoutSessionId: session.id,
      amountCents: parsedAmount,
    },
  });
  await client.save();

  return {
    invoiceId: String(invoice._id),
    checkoutUrl: session.url,
    checkoutSessionId: session.id,
  };
}

async function markEventProcessed(event, clientId = '', metadata = {}) {
  await BillingWebhookEvent.create({
    eventId: event.id,
    eventType: event.type,
    clientId,
    metadata,
  });
}

async function handleInvoiceWebhookEvent(event) {
  const object = event.data?.object || {};
  const invoiceId = object.metadata?.invoice_id || object.metadata?.success_fee_invoice_id || '';
  const fortnightInvoiceId =
    object.metadata?.fortnight_invoice_id ||
    object.lines?.data?.[0]?.metadata?.fortnight_invoice_id ||
    '';

  if (event.type === 'checkout.session.completed' && invoiceId) {
    await markInvoicePaidFromStripe({
      invoiceId,
      checkoutSessionId: object.id || '',
      paymentIntentId: object.payment_intent || '',
      checkoutUrl: object.url || '',
      customerId: object.customer || '',
      subscriptionId: object.subscription || '',
    });
  }

  if (event.type === 'checkout.session.expired' && invoiceId) {
    await markInvoiceCheckoutExpiredFromStripe({
      invoiceId,
      checkoutSessionId: object.id || '',
    });
  }

  if (event.type === 'payment_intent.payment_failed') {
    await markInvoicePaymentFailedFromStripe({
      invoiceId,
      checkoutSessionId: object.metadata?.checkout_session_id || '',
      paymentIntentId: object.id || '',
    });
  }

  if (event.type === 'checkout.session.completed' && fortnightInvoiceId) {
    await markFortnightInvoicePaidFromStripe({
      invoiceId: fortnightInvoiceId,
      checkoutSessionId: object.id || '',
      paymentIntentId: object.payment_intent || '',
      customerId: object.customer || '',
      subscriptionId: object.subscription || '',
    });
  }

  if (event.type === 'payment_intent.payment_failed' && fortnightInvoiceId) {
    await markFortnightInvoicePaymentFailedFromStripe({
      invoiceId: fortnightInvoiceId,
      paymentIntentId: object.id || '',
    });
  }

  if ((event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') && fortnightInvoiceId) {
    await markFortnightInvoiceSubscriptionUpdatedFromStripe({
      invoiceId: fortnightInvoiceId,
      subscriptionId: object.id || '',
      customerId: object.customer || '',
      currentPeriodEnd: object.current_period_end || null,
      cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
      status: event.type === 'customer.subscription.deleted' ? 'canceled' : object.status || '',
    });
  }

  if (event.type === 'invoice.paid' && !fortnightInvoiceId && (object.subscription || object.customer)) {
    await markFortnightInvoiceRenewalPaidFromStripe({
      subscriptionId: object.subscription || '',
      customerId: object.customer || '',
      currentPeriodEnd: object.lines?.data?.[0]?.period?.end || null,
    });
  }

  if (event.type === 'invoice.payment_failed' && !fortnightInvoiceId && (object.subscription || object.customer)) {
    await markFortnightInvoiceRenewalFailedFromStripe({
      subscriptionId: object.subscription || '',
      customerId: object.customer || '',
    });
  }
}

export async function handleStripeWebhook({ body, signature }) {
  const stripe = getStripeClient();

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }

  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  await connectDB();

  const alreadyProcessed = await BillingWebhookEvent.findOne({ eventId: event.id });
  if (alreadyProcessed) {
    return { duplicate: true, eventType: event.type };
  }

  await handleInvoiceWebhookEvent(event);

  let client = null;
  const object = event.data?.object || {};
  const metadataClientId = object.metadata?.client_id || object.client_reference_id || '';

  if (metadataClientId) {
    client = await ClientInfo.findById(metadataClientId);
  }

  if (!client) {
    const subscriptionId = object.subscription || object.id;
    if (subscriptionId && event.type.startsWith('customer.subscription')) {
      client = await ClientInfo.findOne({ 'billing.stripeSubscriptionId': subscriptionId });
    } else if (object.subscription) {
      client = await ClientInfo.findOne({ 'billing.stripeSubscriptionId': object.subscription });
    } else if (object.customer) {
      client = await ClientInfo.findOne({ 'billing.stripeCustomerId': object.customer });
    }
  }

  if (client) {
    if (event.type === 'checkout.session.completed') {
      client.billing.checkoutSessionId = object.id || client.billing.checkoutSessionId;
      client.billing.stripeCustomerId = object.customer || client.billing.stripeCustomerId;
      client.billing.lastPaymentIntentId = object.payment_intent || client.billing.lastPaymentIntentId;

      if (object.mode === 'subscription' || object.subscription) {
        client.billing.stripeSubscriptionId = object.subscription || client.billing.stripeSubscriptionId;
        client.billing.authorisedAt = client.billing.authorisedAt || new Date(event.created * 1000);
        client.billing.subscriptionAuthorisationStatus = 'active';
        client.billing.billingState = BILLING_STATES.ACTIVE_SUBSCRIPTION;
      } else if (object.metadata?.plan_type === BILLING_PLAN_TYPES.SUCCESS_BASED) {
        client.billing.billingState = BILLING_STATES.COMPLETED;
      }

      pushAuditEntry(client, {
        type: 'checkout_completed',
        message: 'Stripe checkout completed.',
        actor: 'stripe',
        source: 'webhook',
        metadata: {
          checkoutSessionId: object.id,
          eventType: event.type,
        },
      });
    }

    if (event.type === 'invoice.paid') {
      client.billing.lastInvoiceId = object.id || client.billing.lastInvoiceId;
      client.billing.billingState = BILLING_STATES.ACTIVE_SUBSCRIPTION;
      if (object.lines?.data?.[0]?.period?.end) {
        client.billing.currentPeriodEnd = new Date(object.lines.data[0].period.end * 1000);
      }
      pushAuditEntry(client, {
        type: 'invoice_paid',
        message: 'Stripe invoice paid successfully.',
        actor: 'stripe',
        source: 'webhook',
        metadata: {
          invoiceId: object.id,
        },
      });
    }

    if (event.type === 'invoice.payment_failed') {
      client.billing.lastInvoiceId = object.id || client.billing.lastInvoiceId;
      client.billing.billingState = BILLING_STATES.PAYMENT_ACTION_REQUIRED;
      pushAuditEntry(client, {
        type: 'invoice_payment_failed',
        message: 'Stripe invoice payment failed.',
        actor: 'stripe',
        source: 'webhook',
        metadata: {
          invoiceId: object.id,
        },
      });
    }

    if (event.type === 'customer.subscription.updated') {
      client.billing.stripeSubscriptionId = object.id || client.billing.stripeSubscriptionId;
      client.billing.cancelAtPeriodEnd = Boolean(object.cancel_at_period_end);
      client.billing.currentPeriodEnd = object.current_period_end
        ? new Date(object.current_period_end * 1000)
        : client.billing.currentPeriodEnd;
      client.billing.billingState = object.cancel_at_period_end
        ? BILLING_STATES.CANCEL_AT_PERIOD_END
        : BILLING_STATES.ACTIVE_SUBSCRIPTION;
      pushAuditEntry(client, {
        type: 'subscription_updated',
        message: 'Stripe subscription updated.',
        actor: 'stripe',
        source: 'webhook',
        metadata: {
          subscriptionId: object.id,
          cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        },
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      client.billing.stripeSubscriptionId = object.id || client.billing.stripeSubscriptionId;
      client.billing.subscriptionAuthorisationStatus = 'cancelled';
      client.billing.billingState = BILLING_STATES.CANCELLED;
      client.billing.cancelledAt = new Date(event.created * 1000);
      client.billing.cancelAtPeriodEnd = false;
      pushAuditEntry(client, {
        type: 'subscription_deleted',
        message: 'Stripe subscription deleted.',
        actor: 'stripe',
        source: 'webhook',
        metadata: {
          subscriptionId: object.id,
        },
      });
    }

    if (event.type === 'payment_intent.payment_failed') {
      client.billing.lastPaymentIntentId = object.id || client.billing.lastPaymentIntentId;
      client.billing.billingState = BILLING_STATES.PAYMENT_ACTION_REQUIRED;
      pushAuditEntry(client, {
        type: 'payment_intent_failed',
        message: 'Stripe payment intent failed.',
        actor: 'stripe',
        source: 'webhook',
        metadata: {
          paymentIntentId: object.id,
        },
      });
    }

    await client.save();
  }

  await markEventProcessed(event, client ? String(client._id) : '', { objectId: object.id || '' });
  return { duplicate: false, eventType: event.type };
}
