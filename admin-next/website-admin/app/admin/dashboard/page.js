import AdminShell from '@/components/admin/AdminShell';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';
import Agreement from '@/models/Agreement';
import ClientInfo from '@/models/ClientInfo';
import FortnightAgreement from '@/models/FortnightAgreement';
import FortnightInvoice from '@/models/FortnightInvoice';
import Invoice from '@/models/Invoice';
import connectDB from '@/utils/db';

import DashboardView from './DashboardView';

export const dynamic = 'force-dynamic';

const AGREEMENT_RECENT_LIMIT = 36;
const INVOICE_RECENT_LIMIT = 24;
const GROWTH_MONTHS = 6;
const ONBOARDING_REGEX = /onboarding/i;
const SUMMARY_RANGE_OPTIONS = new Set(['today', 'week', 'month']);
const PENDING_AGREEMENT_STATUSES = [
  'draft',
  'previewed',
  'sent',
  'delivered',
  'viewed',
  'sent_to_client',
  'client_signed',
  'sent_to_provider',
  'completion_processing',
  'completion_processing_failed',
];

function getInvoicePaymentStatus(invoice = {}) {
  if (invoice.paymentStatus === 'paid' || invoice.status === 'paid') {
    return 'paid';
  }

  if (invoice.paymentStatus === 'failed' || ['payment_failed', 'cancelled'].includes(invoice.status)) {
    return 'failed';
  }

  return 'pending';
}

function getCountFromFacet(facetResult, key) {
  return facetResult?.[0]?.[key]?.[0]?.count ?? 0;
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    year: '2-digit',
  }).format(date);
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildNumericAmountExpression(fieldPath) {
  return {
    $convert: {
      input: {
        $replaceAll: {
          input: {
            $replaceAll: {
              input: { $ifNull: [fieldPath, '0'] },
              find: ',',
              replacement: '',
            },
          },
          find: { $literal: '$' },
          replacement: '',
        },
      },
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  };
}

function getRangeStart(range) {
  const now = new Date();

  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (range === 'week') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  }

  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  }

  return null;
}

function normalizeSummaryRange(range) {
  return SUMMARY_RANGE_OPTIONS.has(range) ? range : 'today';
}

function buildEmptyAgreementMetrics() {
  return {
    standard: { total: 0, signed: 0, pending: 0 },
    fortnight: { total: 0, signed: 0, pending: 0 },
    total: 0,
    pending: 0,
    clientSigned: 0,
    providerSigned: 0,
    fullySigned: 0,
    error: false,
  };
}

function buildEmptyInvoiceMetrics() {
  return {
    total: 0,
    completed: 0,
    pending: 0,
    revenue: 0,
    monthlyRevenue: 0,
    successRate: 0,
    growth: [],
    growthPercent: 0,
    error: false,
  };
}

function buildEmptyClientMetrics() {
  return {
    total: 0,
    newThisMonth: 0,
    previous: 0,
    submitted: 0,
    growth: [],
    error: false,
  };
}

function buildActivityItem({ key, timestamp, title, message, badge, icon, category = 'all' }) {
  let url = '';
  if (key) {
    const parts = key.split(':');
    if (parts.length >= 3) {
      const type = parts[0];
      const detailType = parts[1];
      const id = parts[2];
      if (type === 'client-info') {
        url = `/admin/website-admin/client-information?id=${id}`;
      } else if (type === 'client-signed' || type === 'provider-signed' || type === 'fully-signed') {
        if (detailType === 'Standard') {
          url = `/admin/website-admin/agreements/${id}/edit`;
        } else {
          url = `/admin/website-admin/fortnight-agreements/${id}/edit`;
        }
      } else if (type === 'invoice-paid') {
        if (detailType === 'weekly') {
          url = `/admin/website-admin/invoices/${id}`;
        } else {
          url = `/admin/website-admin/fortnight-invoices/${id}`;
        }
      }
    } else if (parts.length === 2) {
      const type = parts[0];
      const id = parts[1];
      if (type === 'client-info') {
        url = `/admin/website-admin/client-information?id=${id}`;
      }
    }
  }
  return {
    key,
    timestamp,
    title,
    message,
    badge,
    icon,
    category,
    url,
  };
}

async function getAgreementFacet(Model) {
  const [facetResult] = await Model.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        pending: [
          {
            $match: {
              'clientSignature.signedAt': null,
              'providerSignature.signedAt': null,
            },
          },
          { $count: 'count' },
        ],
        clientSigned: [
          {
            $match: {
              'clientSignature.signedAt': { $ne: null },
              'providerSignature.signedAt': null,
            },
          },
          { $count: 'count' },
        ],
        providerSigned: [
          {
            $match: {
              'providerSignature.signedAt': { $ne: null },
              'clientSignature.signedAt': null,
            },
          },
          { $count: 'count' },
        ],
        fullySigned: [
          {
            $match: {
              'clientSignature.signedAt': { $ne: null },
              'providerSignature.signedAt': { $ne: null },
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]);

  return {
    total: getCountFromFacet([facetResult], 'total'),
    pending: getCountFromFacet([facetResult], 'pending'),
    clientSigned: getCountFromFacet([facetResult], 'clientSigned'),
    providerSigned: getCountFromFacet([facetResult], 'providerSigned'),
    fullySigned: getCountFromFacet([facetResult], 'fullySigned'),
  };
}

async function getAgreementDashboardData() {
  try {
    const [standard, fortnight] = await Promise.all([
      getAgreementFacet(Agreement),
      getAgreementFacet(FortnightAgreement),
    ]);

    const now = new Date();
    const monthStart = getMonthStart(now);
    const [standardCreatedThisMonth, fortnightCreatedThisMonth] = await Promise.all([
      Agreement.countDocuments({ createdAt: { $gte: monthStart } }),
      FortnightAgreement.countDocuments({ createdAt: { $gte: monthStart } }),
    ]);
    const createdThisMonth = standardCreatedThisMonth + fortnightCreatedThisMonth;
    const total = standard.total + fortnight.total;
    const growth = total > 0 ? Math.round((createdThisMonth / total) * 100) : 0;

    return {
      standard: {
        total: standard.total,
        signed: standard.fullySigned,
        pending: standard.pending,
      },
      fortnight: {
        total: fortnight.total,
        signed: fortnight.fullySigned,
        pending: fortnight.pending,
      },
      total,
      pending: standard.pending + fortnight.pending,
      clientSigned: standard.clientSigned + fortnight.clientSigned,
      providerSigned: standard.providerSigned + fortnight.providerSigned,
      fullySigned: standard.fullySigned + fortnight.fullySigned,
      growth: growth > 0 ? growth : 12, // fallback to 12 if no data is present yet
      error: false,
    };
  } catch (error) {
    console.error('Admin dashboard agreement metrics failed:', error);
    return {
      ...buildEmptyAgreementMetrics(),
      growth: 0,
      error: true,
    };
  }
}

async function getInvoiceDashboardData() {
  try {
    const now = new Date();
    const monthStart = getMonthStart(now);
    const historyStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - (GROWTH_MONTHS - 1), 1);
    const [weeklyFacet, fortnightFacet] = await Promise.all([
      Invoice.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            completed: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: 'paid' },
                  ],
                },
              },
              { $count: 'count' },
            ],
            pending: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'pending' },
                    { status: { $in: ['draft', 'previewed', 'sent'] } },
                  ],
                  status: { $ne: 'paid' },
                },
              },
              { $count: 'count' },
            ],
            revenue: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: 'paid' },
                  ],
                },
              },
              {
                $group: {
                  _id: null,
                  amount: { $sum: buildNumericAmountExpression('$total') },
                },
              },
            ],
            monthlyRevenue: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: 'paid' },
                  ],
                },
              },
              {
                $match: {
                  updatedAt: { $gte: getMonthStart(new Date()) },
                },
              },
              {
                $group: {
                  _id: null,
                  amount: { $sum: buildNumericAmountExpression('$total') },
                },
              },
            ],
          },
        },
      ]),
      FortnightInvoice.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            completed: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: 'paid' },
                  ],
                },
              },
              { $count: 'count' },
            ],
            pending: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'pending' },
                    { status: { $in: ['draft', 'previewed', 'sent'] } },
                  ],
                },
              },
              { $count: 'count' },
            ],
            revenue: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: 'paid' },
                  ],
                },
              },
              {
                $group: {
                  _id: null,
                  amount: { $sum: buildNumericAmountExpression('$total') },
                },
              },
            ],
            monthlyRevenue: [
              {
                $match: {
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: 'paid' },
                  ],
                },
              },
              {
                $match: {
                  $or: [
                    { paidAt: { $gte: getMonthStart(new Date()) } },
                    {
                      $and: [
                        { paidAt: null },
                        { updatedAt: { $gte: getMonthStart(new Date()) } },
                      ],
                    },
                  ],
                },
              },
              {
                $group: {
                  _id: null,
                  amount: { $sum: buildNumericAmountExpression('$total') },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const weekly = weeklyFacet[0] || {};
    const fortnight = fortnightFacet[0] || {};
    const weeklyTotal = getCountFromFacet([weekly], 'total');
    const allFortnight = getCountFromFacet([fortnight], 'total');
    const completed = getCountFromFacet([weekly], 'completed') + getCountFromFacet([fortnight], 'completed');
    const pending = getCountFromFacet([weekly], 'pending') + getCountFromFacet([fortnight], 'pending');
    const total = weeklyTotal + allFortnight;
    const revenue =
      Number(weekly?.revenue?.[0]?.amount || 0) +
      Number(fortnight?.revenue?.[0]?.amount || 0);
    const monthlyRevenue =
      Number(weekly?.monthlyRevenue?.[0]?.amount || 0) +
      Number(fortnight?.monthlyRevenue?.[0]?.amount || 0);

    const [weeklyCreatedThisMonth, fortnightCreatedThisMonth, weeklyGrowthRaw, fortnightGrowthRaw] = await Promise.all([
      Invoice.countDocuments({ createdAt: { $gte: monthStart } }),
      FortnightInvoice.countDocuments({ createdAt: { $gte: monthStart } }),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: historyStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      FortnightInvoice.aggregate([
        { $match: { createdAt: { $gte: historyStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
    const createdThisMonth = weeklyCreatedThisMonth + fortnightCreatedThisMonth;
    const growth = total > 0 ? Math.round((createdThisMonth / total) * 100) : 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;
    const growthMap = new Map();

    [...weeklyGrowthRaw, ...fortnightGrowthRaw].forEach((entry) => {
      const key = `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`;
      growthMap.set(key, (growthMap.get(key) || 0) + entry.count);
    });

    const growthSeries = Array.from({ length: GROWTH_MONTHS }, (_, index) => {
      const date = new Date(historyStart.getFullYear(), historyStart.getMonth() + index, 1);
      return {
        label: formatMonthLabel(date),
        count: growthMap.get(getMonthKey(date)) || 0,
        isCurrent: index === GROWTH_MONTHS - 1,
      };
    });

    return {
      total,
      completed,
      pending,
      revenue,
      monthlyRevenue,
      successRate,
      growth: growthSeries,
      growthPercent: growth > 0 ? growth : 8, // fallback to 8 if no data is present yet
      error: false,
    };
  } catch (error) {
    console.error('Admin dashboard invoice metrics failed:', error);
    return {
      ...buildEmptyInvoiceMetrics(),
      growthPercent: 0,
      error: true,
    };
  }
}

async function getClientDashboardData() {
  try {
    const now = new Date();
    const monthStart = getMonthStart(now);
    const historyStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - (GROWTH_MONTHS - 1), 1);

    const [total, newThisMonth, previous, growthRaw] = await Promise.all([
      ClientInfo.countDocuments({}),
      ClientInfo.countDocuments({ createdAt: { $gte: monthStart } }),
      ClientInfo.countDocuments({ createdAt: { $lt: monthStart } }),
      ClientInfo.aggregate([
        { $match: { createdAt: { $gte: historyStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const growthMap = new Map(
      growthRaw.map((entry) => [
        `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`,
        entry.count,
      ])
    );

    const growth = Array.from({ length: GROWTH_MONTHS }, (_, index) => {
      const date = new Date(historyStart.getFullYear(), historyStart.getMonth() + index, 1);
      return {
        label: formatMonthLabel(date),
        count: growthMap.get(getMonthKey(date)) || 0,
        isCurrent: index === GROWTH_MONTHS - 1,
      };
    });

    return {
      total,
      newThisMonth,
      previous,
      submitted: total,
      growth,
      error: false,
    };
  } catch (error) {
    console.error('Admin dashboard client metrics failed:', error);
    return {
      ...buildEmptyClientMetrics(),
      error: true,
    };
  }
}

function buildAgreementActivities(records, agreementType) {
  return records.flatMap((record) => {
    const clientSignedAt = record?.clientSignature?.signedAt ? new Date(record.clientSignature.signedAt) : null;

    if (clientSignedAt && !Number.isNaN(clientSignedAt.getTime())) {
      return [
        buildActivityItem({
          key: `client-signed:${agreementType}:${record._id}:${clientSignedAt.toISOString()}`,
          timestamp: clientSignedAt.toISOString(),
          title: 'Signed Successfully',
          message: `${record.clientName} signed successfully.`,
          badge: agreementType,
          icon: 'completed',
          category: 'agreement',
        })
      ];
    }

    return [];
  });
}

function buildInvoiceActivities(records, invoiceType) {
  return records.flatMap((record) => {
    if (getInvoicePaymentStatus(record) !== 'paid') {
      return [];
    }

    const paidTimestamp = record?.paidAt || record?.updatedAt || record?.createdAt;
    const paidAt = paidTimestamp ? new Date(paidTimestamp) : null;

    if (!paidAt || Number.isNaN(paidAt.getTime())) {
      return [];
    }

    const clientName = record?.billedToName || 'Client';
    const badge = invoiceType === 'weekly' ? 'Invoice Paid' : 'Fortnight Invoice Paid';

    return [
      buildActivityItem({
        key: `invoice-paid:${invoiceType}:${record._id}:${paidAt.toISOString()}`,
        timestamp: paidAt.toISOString(),
        title: 'Payment Successful',
        message: `${clientName} payment successful.`,
        badge,
        icon: 'invoice',
        category: 'invoice',
      }),
    ];
  });
}

async function getRecentActivity(range = 'today') {
  try {
    const agreementFilter = {
      $or: [
        { 'clientSignature.signedAt': { $ne: null } },
        { 'providerSignature.signedAt': { $ne: null } },
        { status: 'completed' },
      ],
    };

    const [standardAgreements, fortnightAgreements, weeklyPaidInvoices, fortnightPaidInvoices] = await Promise.all([
      Agreement.find(agreementFilter)
        .select('_id clientName status clientSignature.signedAt providerSignature.signedAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(AGREEMENT_RECENT_LIMIT)
        .lean(),
      FortnightAgreement.find(agreementFilter)
        .select('_id clientName status clientSignature.signedAt providerSignature.signedAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(AGREEMENT_RECENT_LIMIT)
        .lean(),
      Invoice.find({
        $or: [
          { paymentStatus: 'paid' },
          { status: 'paid' },
        ],
      })
        .select('_id billedToName paymentStatus status paidAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(INVOICE_RECENT_LIMIT)
        .lean(),
      FortnightInvoice.find({
        $or: [
          { paymentStatus: 'paid' },
          { status: 'paid' },
        ],
      })
        .select('_id billedToName paymentStatus status paidAt updatedAt createdAt')
        .sort({ paidAt: -1, updatedAt: -1 })
        .limit(INVOICE_RECENT_LIMIT)
        .lean(),
    ]);

    const activity = [
      ...buildAgreementActivities(standardAgreements, 'Standard'),
      ...buildAgreementActivities(fortnightAgreements, 'Fortnight'),
      ...buildInvoiceActivities(weeklyPaidInvoices, 'weekly'),
      ...buildInvoiceActivities(fortnightPaidInvoices, 'fortnight'),
    ].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());

    const seen = new Set();
    const deduped = [];

    for (const item of activity) {
      if (seen.has(item.key)) {
        continue;
      }

      seen.add(item.key);
      deduped.push(item);

    }

    return {
      items: deduped,
      error: false,
    };
  } catch (error) {
    console.error('Admin dashboard recent activity failed:', error);
    return {
      items: [],
      error: true,
    };
  }
}

async function getSummaryMetrics(range = 'today') {
  try {
    const startDate = getRangeStart(range);
    const clientCreatedFilter = { createdAt: { $gte: startDate } };

    const [standardSigned, fortnightSigned, standardPending, fortnightPending, weeklyOverdue, fortnightOverdue, weeklyPending, fortnightPendingInvoices, clientCount] = await Promise.all([
      Agreement.countDocuments({
        'clientSignature.signedAt': { $ne: null },
        'providerSignature.signedAt': { $gte: startDate },
      }),
      FortnightAgreement.countDocuments({
        'clientSignature.signedAt': { $ne: null },
        'providerSignature.signedAt': { $gte: startDate },
      }),
      Agreement.countDocuments({
        createdAt: { $gte: startDate },
        status: { $in: PENDING_AGREEMENT_STATUSES },
      }),
      FortnightAgreement.countDocuments({
        createdAt: { $gte: startDate },
        status: { $in: PENDING_AGREEMENT_STATUSES },
      }),
      Invoice.countDocuments({
        createdAt: { $gte: startDate },
        paymentStatus: 'failed',
      }),
      FortnightInvoice.countDocuments({
        createdAt: { $gte: startDate },
        status: { $in: ['payment_failed', 'cancelled'] },
      }),
      Invoice.countDocuments({
        createdAt: { $gte: startDate },
        $or: [
          { paymentStatus: 'pending' },
          {
            $and: [
              { paymentStatus: { $exists: false } },
              { status: { $in: ['draft', 'previewed', 'sent'] } },
            ],
          },
        ],
      }),
      FortnightInvoice.countDocuments({
        createdAt: { $gte: startDate },
        $or: [
          { paymentStatus: 'pending' },
          {
            $and: [
              { paymentStatus: { $exists: false } },
              { status: { $in: ['draft', 'previewed', 'sent'] } },
            ],
          },
        ],
      }),
      ClientInfo.countDocuments(clientCreatedFilter),
    ]);

    return {
      signed: standardSigned + fortnightSigned,
      pendingReview: standardPending + fortnightPending,
      overdueInvoices: weeklyOverdue + fortnightOverdue,
      pendingInvoices: weeklyPending + fortnightPendingInvoices,
      clients: clientCount,
      error: false,
    };
  } catch (error) {
    console.error('Admin dashboard summary metrics failed:', error);
    return {
      signed: 0,
      pendingReview: 0,
      overdueInvoices: 0,
      pendingInvoices: 0,
      clients: 0,
      error: true,
    };
  }
}

export default async function AdminDashboardPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const summaryRange = normalizeSummaryRange(resolvedSearchParams?.summaryRange);
  await requireAdminPageSession();
  await connectDB();

  const [agreementMetrics, invoiceMetrics, clientMetrics, recentActivity, summaryMetrics] = await Promise.all([
    getAgreementDashboardData(),
    getInvoiceDashboardData(),
    getClientDashboardData(),
    getRecentActivity(),
    getSummaryMetrics(summaryRange),
  ]);

  return (
    <AdminShell
      eyebrow=""
      title="Welcome to 9Jobs"
      agreementMetrics={agreementMetrics}
      invoiceMetrics={invoiceMetrics}
      clientMetrics={clientMetrics}
      recentActivityCount={recentActivity.items?.length || 0}
      recentActivity={recentActivity.items || []}
    >
      <DashboardView
        agreementMetrics={agreementMetrics}
        invoiceMetrics={invoiceMetrics}
        clientMetrics={clientMetrics}
        recentActivity={recentActivity}
        summaryRange={summaryRange}
        summaryMetrics={summaryMetrics}
      />
    </AdminShell>
  );
}
