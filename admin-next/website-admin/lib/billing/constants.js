export const BILLING_STATES = {
  PENDING_AGREEMENT: 'PENDING_AGREEMENT',
  PENDING_CHECKOUT: 'PENDING_CHECKOUT',
  ACTIVE_SUBSCRIPTION: 'ACTIVE_SUBSCRIPTION',
  PAYMENT_ACTION_REQUIRED: 'PAYMENT_ACTION_REQUIRED',
  CANCEL_AT_PERIOD_END: 'CANCEL_AT_PERIOD_END',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
  SUCCESS_FEE_DUE: 'SUCCESS_FEE_DUE',
  COMPLETED: 'COMPLETED',
};

export const BILLING_PLAN_TYPES = {
  NONE: 'none',
  STANDARD_WEEKLY: 'standard_weekly',
  SUCCESS_BASED: 'success_based',
};

export const DEFAULT_WEEKLY_TERMS_VERSION = 'weekly-subscription-v2';

export const ONE_TIME_CHECKOUT_PLANS = {
  Trial: {
    unitAmount: 5000,
    currency: 'aud',
    description: 'Trial plan - / 2 days',
  },
  'Resume Makeover': {
    unitAmount: 4900,
    currency: 'aud',
    description: 'Resume Makeover plan - one-time',
  },
  'Resume + LinkedIn Optimisation': {
    unitAmount: 8900,
    currency: 'aud',
    description: 'Resume + LinkedIn Optimisation plan - one-time',
  },
  'Resume + LinkedIn + Seek Optimization': {
    unitAmount: 8900,
    currency: 'aud',
    description: 'Resume + LinkedIn + Seek Optimization plan - one-time',
  },
  'Resume + LinkedIn + SEEK Optimisation': {
    unitAmount: 8900,
    currency: 'aud',
    description: 'Resume + LinkedIn + SEEK Optimisation plan - one-time',
  },
  'Resume, LinkedIn & SEEK Optimisation': {
    unitAmount: 8900,
    currency: 'aud',
    description: 'Resume, LinkedIn & SEEK Optimisation plan - one-time',
  },
};

export const SUCCESS_FEE_DEFAULT_DESCRIPTION = '9Jobs success fee';
