'use client';

import Link from 'next/link';
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  CircleCheckBig,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  Files,
  PenLine,
  ReceiptText,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  ChevronRight,
  ArrowRight,
  Info,
  PlusCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

function formatNumber(value) {
  return new Intl.NumberFormat('en-AU').format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number.isFinite(value) ? value.toFixed(value >= 10 ? 0 : 1) : '0'}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getSummaryLabels(range) {
  if (range === 'week') {
    return {
      signed: 'Signed Past Week',
      pending: 'Pending Review',
      overdue: 'Overdue Invoices',
      invoices: 'Pending Invoices',
      clients: 'Clients This Week',
    };
  }

  if (range === 'month') {
    return {
      signed: 'Signed Past Month',
      pending: 'Pending Review',
      overdue: 'Overdue Invoices',
      invoices: 'Pending Invoices',
      clients: 'Clients This Month',
    };
  }

  return {
    signed: 'Signed Today',
    pending: 'Pending Review',
    overdue: 'Overdue Invoices',
    invoices: 'Pending Invoices',
    clients: 'Clients Today',
  };
}

function formatShortDateTime(value) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getActivityIcon(icon) {
  const props = { size: 18, strokeWidth: 2.2 };

  if (icon === 'client') {
    return <PenLine {...props} />;
  }

  if (icon === 'provider') {
    return <UserCheck {...props} />;
  }

  if (icon === 'completed') {
    return <CircleCheckBig {...props} />;
  }

  return <UserRound {...props} />;
}

function getActivityTone(icon) {
  if (icon === 'completed') {
    return 'green';
  }
  if (icon === 'provider') {
    return 'violet';
  }
  if (icon === 'client') {
    return 'blue';
  }
  return 'lime';
}

function getLineChartGeometry(data, width, height, padding, maxOverride) {
  const safeData = Array.isArray(data) && data.length ? data : [{ label: '', count: 0 }];
  const max = maxOverride || Math.max(...safeData.map((entry) => entry.count), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = safeData.map((entry, index) => {
    const x = padding.left + (safeData.length === 1 ? innerWidth / 2 : (index * innerWidth) / (safeData.length - 1));
    const y = padding.top + innerHeight - (entry.count / max) * innerHeight;
    return { ...entry, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  return {
    max,
    points,
    linePath,
    areaPath,
  };
}

function DonutChart({ total, segments, centerLabel }) {
  const safeTotal = Math.max(total, 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const chartSegments = segments.reduce((accumulator, segment) => {
    const previousOffset = accumulator.nextOffset;
    const segmentLength = safeTotal > 0 ? (segment.value / safeTotal) * circumference : 0;

    accumulator.items.push({
      ...segment,
      dashArray: `${segmentLength} ${circumference - segmentLength}`,
      strokeDashoffset: -previousOffset,
    });
    accumulator.nextOffset += segmentLength;

    return accumulator;
  }, { items: [], nextOffset: 0 }).items;

  return (
    <div className="donut-card__visual">
      <svg viewBox="0 0 180 180" className="donut-chart" aria-hidden="true">
        <circle cx="90" cy="90" r={radius} className="donut-chart__track" fill="none" />
        {chartSegments.map((segment) => {
          return (
            <circle
              key={segment.label}
              cx="90"
              cy="90"
              r={radius}
              className="donut-chart__segment"
              stroke={segment.color}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.strokeDashoffset}
              fill="none"
            />
          );
        })}
      </svg>

      <div className="donut-card__center">
        <strong>{formatNumber(total)}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
  badge = null,
  showMiniDonut = false,
  percent = 0,
}) {
  return (
    <motion.article
      className={`dashboard-card kpi-card kpi-card--${tone}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="kpi-card__header">
        <span className="kpi-card__icon">
          <Icon size={21} strokeWidth={2.2} />
        </span>
        {badge ? (
          <span className={`kpi-card__badge kpi-card__badge--${badge.tone}`}>
            <TrendingUp size={12} style={{ marginRight: '4px', display: 'inline' }} />
            {badge.text}
          </span>
        ) : null}
      </div>

      <div className="kpi-card__body">
        <div style={{ flex: 1 }}>
          <p className="kpi-card__label">{label}</p>
          <strong className="kpi-card__value">{value}</strong>
          <p className={`kpi-card__detail ${tone === 'lime' ? 'kpi-card__detail--highlight' : ''}`}>{detail}</p>
        </div>

        {showMiniDonut ? (
          <div className="kpi-card__donut-container">
            <svg className="kpi-card__donut" viewBox="0 0 36 36">
              <circle className="kpi-card__donut-bg" cx="18" cy="18" r="15.915" fill="none" />
              <circle
                className="kpi-card__donut-val"
                cx="18"
                cy="18"
                r="15.915"
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset="25"
                fill="none"
              />
            </svg>
          </div>
        ) : (
          <div className={`kpi-card__accent kpi-card__accent--${tone}`}>
            <Icon size={28} strokeWidth={1.9} />
          </div>
        )}
      </div>
    </motion.article>
  );
}

function OverviewList({ items }) {
  return (
    <div className="overview-list">
      {items.map((item) => (
        <div className="overview-list__item" key={item.label}>
          <div className="overview-list__left">
            <span className={`overview-list__icon overview-list__icon--${item.tone}`}>
              <item.icon size={16} strokeWidth={2.2} />
            </span>
            <span className="overview-list__label">{item.label}</span>
          </div>
          <strong className="overview-list__value">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ActivityItem({ item }) {
  const tone = getActivityTone(item.icon);

  return (
    <motion.div
      className="activity-item"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      whileHover={{ y: -2 }}
    >
      <div className={`activity-item__icon activity-item__icon--${tone}`}>{getActivityIcon(item.icon)}</div>
      <div className="activity-item__body">
        <div className="activity-item__top">
          <p>{item.title}</p>
          <span>{formatShortDateTime(item.timestamp)}</span>
        </div>
        <p className="activity-item__message">{item.message}</p>
      </div>
    </motion.div>
  );
}

export default function DashboardView({
  agreementMetrics,
  invoiceMetrics,
  clientMetrics,
  recentActivity,
  summaryRange,
  summaryMetrics,
}) {
  const successRate = invoiceMetrics.successRate || 0;
  const chartData = invoiceMetrics.growth || [];
  const agreementDonutSegments = [
    { label: 'Signed', value: agreementMetrics.fullySigned, color: '#84cc16' },
    { label: 'Client Signed', value: agreementMetrics.clientSigned, color: '#3b82f6' },
    { label: 'Provider Signed', value: agreementMetrics.providerSigned, color: '#fb923c' },
    { label: 'Pending', value: agreementMetrics.pending, color: '#cbd5e1' },
  ];
  const invoiceOtherCount = Math.max(invoiceMetrics.total - invoiceMetrics.completed - invoiceMetrics.pending, 0);
  const invoiceDonutSegments = [
    { label: 'Completed', value: invoiceMetrics.completed, color: '#84cc16' },
    { label: 'Pending', value: invoiceMetrics.pending, color: '#f59e0b' },
    { label: 'Other', value: invoiceOtherCount, color: '#a855f7' },
  ];
  
  const maxVal = Math.max(...chartData.map((d) => d.count), 1);
  const maxY = maxVal <= 4 ? 4 : maxVal <= 8 ? 8 : Math.ceil(maxVal / 4) * 4;
  
  const lineChart = getLineChartGeometry(chartData, 680, 270, {
    top: 22,
    right: 14,
    bottom: 34,
    left: 35,
  }, maxY);

  const agreementStatusGroups = [
    {
      label: 'Standard Agreement',
      tone: 'green',
      hrefs: {
        total: '/admin/website-admin/agreements?metric=total',
        signed: '/admin/website-admin/agreements?metric=signed',
        pending: '/admin/website-admin/agreements?metric=pending',
      },
      items: [
        { label: 'Total Agreement', value: formatNumber(agreementMetrics.standard.total), hrefKey: 'total' },
        { label: 'Signed Agreement', value: formatNumber(agreementMetrics.standard.signed), hrefKey: 'signed' },
        { label: 'Pending Agreement', value: formatNumber(agreementMetrics.standard.pending), hrefKey: 'pending' },
      ],
    },
    {
      label: 'Fortnight Agreement',
      tone: 'blue',
      hrefs: {
        total: '/admin/website-admin/fortnight-agreements?metric=total',
        signed: '/admin/website-admin/fortnight-agreements?metric=signed',
        pending: '/admin/website-admin/fortnight-agreements?metric=pending',
      },
      items: [
        { label: 'Total Agreement', value: formatNumber(agreementMetrics.fortnight.total), hrefKey: 'total' },
        { label: 'Signed Agreement', value: formatNumber(agreementMetrics.fortnight.signed), hrefKey: 'signed' },
        { label: 'Pending Agreement', value: formatNumber(agreementMetrics.fortnight.pending), hrefKey: 'pending' },
      ],
    },
  ];
  const invoiceStatusItems = [
    { label: 'Total Invoice', value: formatNumber(invoiceMetrics.total), tone: 'blue', href: '/admin/website-admin/invoices?metric=total' },
    { label: 'Completed Invoice', value: formatNumber(invoiceMetrics.completed), tone: 'green', href: '/admin/website-admin/invoices?metric=completed' },
    { label: 'Pending', value: formatNumber(invoiceMetrics.pending), tone: 'orange', href: '/admin/website-admin/invoices?metric=pending' },
    { label: 'Total Revenue', value: formatCurrency(invoiceMetrics.revenue), tone: 'violet', href: '/admin/website-admin/invoices?metric=revenue' },
  ];
  const summaryLabels = getSummaryLabels(summaryRange);
  const summaryFilters = [
    { label: 'Today', value: 'today' },
    { label: 'Past Week', value: 'week' },
    { label: 'Past Month', value: 'month' },
  ];
  const bottomSummary = [
    {
      label: summaryLabels.signed,
      value: formatNumber(summaryMetrics.signed),
      icon: CircleCheckBig,
      tone: 'green',
    },
    {
      label: summaryLabels.pending,
      value: formatNumber(summaryMetrics.pendingReview),
      icon: Clock3,
      tone: 'orange',
    },
    {
      label: summaryLabels.overdue,
      value: formatNumber(summaryMetrics.overdueInvoices),
      icon: CircleAlert,
      tone: 'red',
    },
    {
      label: summaryLabels.invoices,
      value: formatNumber(summaryMetrics.pendingInvoices),
      icon: ReceiptText,
      tone: 'violet',
    },
    {
      label: summaryLabels.clients,
      value: formatNumber(summaryMetrics.clients),
      icon: Users,
      tone: 'blue',
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="kpi-grid">
        <KpiCard
          icon={CircleDollarSign}
          label="Total Revenue"
          value={formatCurrency(invoiceMetrics.monthlyRevenue)}
          detail="Total revenue in this month"
          tone="lime"
          badge={{ text: 'MTD', tone: 'green' }}
        />
        <KpiCard
          icon={TrendingUp}
          label="Success Rate"
          value={formatPercent(successRate)}
          detail="Successful invoice payments"
          tone="green"
          showMiniDonut
          percent={successRate}
        />
      </section>

      <section className="analytics-grid">
        <motion.article
          className="dashboard-card analytics-card analytics-card--wide"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34 }}
        >
          <div className="analytics-card__header">
            <div className="analytics-card__title">
              <span className="analytics-card__icon analytics-card__icon--lime">
                <TrendingUp size={17} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Invoice Growth Overview</h2>
                <p>Realtime invoice activity over time</p>
              </div>
            </div>
          </div>

          <div className="line-chart">
            <svg viewBox="0 0 680 270" className="line-chart__svg" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="clientGrowthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(126, 211, 33, 0.32)" />
                  <stop offset="100%" stopColor="rgba(126, 211, 33, 0.02)" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map((i) => {
                const val = (maxY / 4) * i;
                const innerHeight = 270 - 22 - 34;
                const y = 22 + innerHeight - (val / maxY) * innerHeight;
                return (
                  <g key={`grid-${val}`}>
                    <line
                      x1="35"
                      x2="666"
                      y1={y}
                      y2={y}
                      className="line-chart__grid"
                    />
                    <text
                      x="22"
                      y={y + 4}
                      textAnchor="end"
                      className="line-chart__axis-label"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              <path d={lineChart.areaPath} fill="url(#clientGrowthFill)" />
              <path d={lineChart.linePath} className="line-chart__path" />

              {lineChart.points.map((point, index) => {
                const isLast = index === lineChart.points.length - 1;
                return (
                  <g key={point.label}>
                    {isLast && (
                      <>
                        <circle cx={point.x} cy={point.y} r="5.5" className="line-chart__point" />
                        <text x={point.x} y={point.y - 14} textAnchor="middle" className="line-chart__point-label">
                          {point.count}
                        </text>
                      </>
                    )}
                    <text x={point.x} y="258" textAnchor="middle" className="line-chart__month-label">
                      {point.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </motion.article>

        <motion.article
          className="dashboard-card analytics-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.04 }}
        >
          <div className="analytics-card__header analytics-card__header--compact">
            <div className="analytics-card__title">
              <span className="analytics-card__icon analytics-card__icon--green">
                <FileCheck2 size={17} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Agreement Status</h2>
                <p>Overview of all agreements</p>
              </div>
            </div>
          </div>

          <div className="status-grid status-grid--agreement">
            {agreementStatusGroups.map((group) => (
              <div className="status-block" key={group.label}>
                <div className="status-block__header">
                  <span className={`status-block__dot status-block__dot--${group.tone}`} />
                  <h3>{group.label}</h3>
                </div>
                <div className="status-block__rows">
                  {group.items.map((item) => (
                    <Link
                      href={group.hrefs[item.hrefKey]}
                      className="status-block__row status-block__row--link"
                      key={`${group.label}-${item.label}`}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.article>

        <motion.article
          className="dashboard-card analytics-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.08 }}
        >
          <div className="analytics-card__header analytics-card__header--compact">
            <div className="analytics-card__title">
              <span className="analytics-card__icon analytics-card__icon--blue">
                <FileSpreadsheet size={17} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Invoice Status</h2>
                <p>Overview of all invoices</p>
              </div>
            </div>
          </div>

          <div className="status-panel status-panel--single">
            <div className="status-panel__donut">
              <DonutChart total={invoiceMetrics.total} segments={invoiceDonutSegments} centerLabel="Total" />
            </div>

            <div className="status-block__rows status-block__rows--invoice">
              {invoiceStatusItems.map((item) => (
                <Link href={item.href} className="status-block__row status-block__row--link" key={item.label}>
                  <div className="status-block__row-left">
                    <span className={`status-block__dot status-block__dot--${item.tone}`} />
                    <span>{item.label}</span>
                  </div>
                  <strong>{item.value}</strong>
                </Link>
              ))}
            </div>
          </div>
        </motion.article>
      </section>

      <section className="details-grid">
      </section>

      <section className="summary-strip-shell">
        <div className="summary-filter-bar">
          {summaryFilters.map((filter) => (
            <Link
              key={filter.value}
              href={`/admin/website-admin/dashboard?summaryRange=${filter.value}`}
              className={`summary-filter-chip${summaryRange === filter.value ? ' summary-filter-chip--active' : ''}`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <section className="summary-strip">
          {bottomSummary.map((item) => (
            <div className="summary-strip__item" key={item.label}>
              <span className={`summary-strip__icon summary-strip__icon--${item.tone}`}>
                <item.icon size={18} strokeWidth={2.2} />
              </span>
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            </div>
          ))}
        </section>
      </section>

      <style jsx global>{`
        .dashboard-page {
          display: grid;
          gap: 16px;
          padding-bottom: 18px;
        }

        .dashboard-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-top: 4px;
        }

        .dashboard-hero h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(2rem, 3vw, 3.1rem);
          line-height: 1.02;
          letter-spacing: -0.05em;
        }

        .dashboard-hero p {
          margin: 12px 0 0;
          color: #475569;
          font-size: 1.02rem;
          line-height: 1.55;
          font-style: italic;
        }

        .waving-hand {
          display: inline-block;
          animation: wave-animation 2.5s infinite;
          transform-origin: 70% 70%;
        }

        @keyframes wave-animation {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }

        .dashboard-card {
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .kpi-card {
          padding: 18px 20px 16px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .kpi-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(217, 255, 95, 0.2);
        }

        .kpi-card--lime {
          background: radial-gradient(circle at top left, rgba(217, 255, 95, 0.22), transparent 32%), #fff;
        }

        .kpi-card--blue {
          background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 32%), #fff;
        }

        .kpi-card--violet {
          background: radial-gradient(circle at top left, rgba(139, 92, 246, 0.12), transparent 32%), #fff;
        }

        .kpi-card--orange {
          background: radial-gradient(circle at top left, rgba(251, 146, 60, 0.14), transparent 32%), #fff;
        }

        .kpi-card--green {
          background: radial-gradient(circle at top left, rgba(34, 197, 94, 0.12), transparent 32%), #fff;
        }

        .kpi-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .kpi-card__icon {
          width: 50px;
          height: 50px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--kpi-bg, #f8fafc) 82%, white);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.85);
          color: #0f172a;
        }

        .kpi-card--lime .kpi-card__icon {
          background: rgba(217, 255, 95, 0.24);
          color: #3f6212;
        }

        .kpi-card--blue .kpi-card__icon {
          background: rgba(59, 130, 246, 0.12);
          color: #2563eb;
        }

        .kpi-card--violet .kpi-card__icon {
          background: rgba(139, 92, 246, 0.12);
          color: #7c3aed;
        }

        .kpi-card--orange .kpi-card__icon {
          background: rgba(251, 146, 60, 0.14);
          color: #ea580c;
        }

        .kpi-card--green .kpi-card__icon {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .kpi-card__badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
        }

        .kpi-card__badge--green {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .kpi-card__badge--orange {
          background: rgba(251, 146, 60, 0.14);
          color: #ea580c;
        }

        .kpi-card__body {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          min-height: 112px;
        }

        .kpi-card__label {
          margin: 0;
          color: #334155;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .kpi-card__value {
          display: block;
          margin: 8px 0 10px;
          color: #0f172a;
          font-size: clamp(1.8rem, 2vw, 2.45rem);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .kpi-card__detail {
          margin: 0;
          color: #64748b;
          font-size: 0.86rem;
          line-height: 1.55;
          font-style: italic;
        }

        .kpi-card__detail--highlight {
          color: #16a34a !important;
          font-weight: 700;
        }

        .kpi-card__accent {
          width: 78px;
          height: 78px;
          border-radius: 26px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.92);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
          opacity: 0.95;
        }

        .kpi-card__accent--lime {
          background: radial-gradient(circle at 30% 30%, rgba(217, 255, 95, 0.42), rgba(217, 255, 95, 0.16));
          color: #4d7c0f;
        }

        .kpi-card__accent--green {
          background: radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.24), rgba(34, 197, 94, 0.08));
          color: #16a34a;
        }

        .kpi-card__donut-container {
          width: 52px;
          height: 52px;
          position: relative;
          flex: 0 0 auto;
        }

        .kpi-card__donut {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .kpi-card__donut-bg {
          fill: none;
          stroke: #f1f5f9;
          stroke-width: 4;
        }

        .kpi-card__donut-val {
          fill: none;
          stroke: #84cc16;
          stroke-width: 4;
          stroke-linecap: round;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
        }

        .analytics-card {
          padding: 16px 18px 18px;
        }

        .analytics-card--wide {
          padding-bottom: 16px;
        }

        .analytics-card__header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .analytics-card__header--compact {
          margin-bottom: 12px;
        }

        .status-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr);
          gap: 18px;
          align-items: start;
          padding-top: 8px;
        }

        .status-panel--single {
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr);
        }

        .status-panel__donut {
          border: 1px solid rgba(226, 232, 240, 0.85);
          border-radius: 20px;
          padding: 14px 14px 12px;
          background: rgba(255, 255, 255, 0.82);
        }

        .analytics-card__title {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .analytics-card__icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .analytics-card__icon--lime {
          background: rgba(217, 255, 95, 0.2);
          color: #3f6212;
        }

        .analytics-card__icon--green {
          background: rgba(132, 204, 22, 0.16);
          color: #4d7c0f;
        }

        .analytics-card__icon--blue {
          background: rgba(59, 130, 246, 0.12);
          color: #2563eb;
        }

        .analytics-card h2,
        .detail-card h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1.05rem;
          letter-spacing: -0.02em;
        }

        .analytics-card p,
        .detail-card p {
          margin: 4px 0 0;
          color: #64748b;
          line-height: 1.45;
          font-style: italic;
        }

        .analytics-card__control {
          padding: 9px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #fff;
          color: #0f172a;
          font-size: 0.84rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .line-chart {
          height: 270px;
        }

        .line-chart__svg {
          width: 100%;
          height: 100%;
        }

        .line-chart__grid {
          stroke: rgba(203, 213, 225, 0.5);
          stroke-width: 1;
        }

        .line-chart__path {
          fill: none;
          stroke: #7ed321;
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .line-chart__point {
          fill: #7ed321;
          stroke: #ffffff;
          stroke-width: 3;
        }

        .line-chart__point-label {
          fill: #0f172a;
          font-size: 12px;
          font-weight: 700;
        }

        .line-chart__month-label {
          fill: #334155;
          font-size: 12px;
          font-weight: 600;
        }

        .line-chart__axis-label {
          fill: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .donut-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 8px;
        }

        .donut-card__visual {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0;
          flex-shrink: 0;
        }

        .donut-chart {
          width: 120px;
          height: 120px;
          transform: rotate(-90deg);
        }

        .donut-chart__track {
          fill: none;
          stroke: rgba(226, 232, 240, 0.9);
          stroke-width: 14;
        }

        .donut-chart__segment {
          fill: none;
          stroke-width: 14;
          stroke-linecap: butt;
        }

        .donut-card__center {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          align-content: center;
        }

        .donut-card__center strong {
          color: #0f172a;
          font-size: 1.45rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .donut-card__center span {
          color: #64748b;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .donut-card__legend {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .donut-card__legend-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }

        .donut-card__legend-left {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .donut-card__legend-row strong {
          color: #0f172a;
          font-size: 0.82rem;
        }

        .donut-card__dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .status-grid--agreement {
          padding-top: 8px;
        }

        .status-block {
          border: 1px solid rgba(226, 232, 240, 0.85);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.72);
        }

        .status-block__header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .status-block__header h3 {
          margin: 0;
          color: #0f172a;
          font-size: 0.98rem;
        }

        .status-block__rows {
          display: grid;
          gap: 10px;
        }

        .status-block__rows--invoice {
          padding-top: 8px;
        }

        .status-block__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #334155;
          font-size: 0.92rem;
          font-weight: 600;
        }

        .status-block__row--link {
          text-decoration: none;
          border-radius: 10px;
          padding: 6px 8px;
          margin: 0 -8px;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .status-block__row--link:hover {
          background: rgba(248, 250, 252, 0.95);
          transform: translateX(2px);
        }

        .status-block__row strong {
          color: #0f172a;
          font-size: 1rem;
        }

        .status-block__row-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-block__dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .status-block__dot--green {
          background: #84cc16;
        }

        .status-block__dot--blue {
          background: #3b82f6;
        }

        .status-block__dot--orange {
          background: #f59e0b;
        }

        .status-block__dot--violet {
          background: #a855f7;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          align-items: stretch;
        }

        .detail-card {
          padding: 16px 18px 18px;
          min-height: 380px;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }

        .detail-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
        }

        .detail-card--activity {
          min-height: 100%;
        }

        .detail-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .detail-card__title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .detail-card__icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
        }

        .detail-card__icon--blue {
          background: rgba(59, 130, 246, 0.12);
          color: #2563eb;
        }

        .detail-card__icon--violet {
          background: rgba(139, 92, 246, 0.12);
          color: #7c3aed;
        }

        .detail-card__icon--sky {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
        }

        .detail-card__icon--navy {
          background: rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .detail-card__arrow {
          color: #94a3b8;
        }

        .detail-card__footer {
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
        }

        .detail-card__view-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #3b82f6;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: gap 0.2s ease;
        }

        .detail-card__view-all:hover {
          gap: 8px;
          color: #2563eb;
        }

        .detail-card__header-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #fff;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .detail-card__header-btn:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: rgba(148, 163, 184, 0.3);
        }

        .summary-filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .summary-filter-chip {
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #fff;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .summary-filter-chip:hover {
          border-color: rgba(132, 204, 22, 0.3);
          color: #3f6212;
          background: rgba(217, 255, 95, 0.12);
        }

        .summary-filter-chip--active {
          border-color: rgba(132, 204, 22, 0.45);
          background: rgba(217, 255, 95, 0.22);
          color: #3f6212;
        }

        .overview-list {
          display: grid;
          gap: 8px;
        }

        .overview-list__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
        }

        .overview-list__item:first-child {
          border-top: none;
          padding-top: 0;
        }

        .overview-list__left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .overview-list__icon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .overview-list__icon--orange {
          background: rgba(251, 146, 60, 0.14);
          color: #ea580c;
        }

        .overview-list__icon--slate {
          background: rgba(148, 163, 184, 0.12);
          color: #475569;
        }

        .overview-list__icon--green {
          background: rgba(34, 197, 94, 0.14);
          color: #16a34a;
        }

        .overview-list__icon--lime {
          background: rgba(217, 255, 95, 0.28);
          color: #4d7c0f;
        }

        .overview-list__icon--red {
          background: rgba(239, 68, 68, 0.14);
          color: #dc2626;
        }

        .overview-list__label {
          color: #0f172a;
          font-size: 0.94rem;
          font-weight: 600;
        }

        .overview-list__value {
          color: #0f172a;
          font-size: 1rem;
          letter-spacing: -0.02em;
        }

        .detail-card__note {
          margin-top: auto;
          padding: 14px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.96));
          border: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }

        .detail-card__note-top {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .detail-card__note-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(217, 255, 95, 0.26);
          color: #4d7c0f;
          flex: 0 0 auto;
        }

        .detail-card__note strong {
          color: #0f172a;
          display: block;
          margin-bottom: 3px;
        }

        .detail-card__note p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
          font-style: italic;
        }

        .detail-card__avatars {
          display: flex;
          align-items: center;
          padding-left: 8px;
        }

        .avatar-overlap {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 2px solid #fff;
          margin-left: -8px;
          flex-shrink: 0;
        }

        .avatar-overlap:first-child {
          margin-left: 0;
        }

        .activity-list {
          display: grid;
          gap: 10px;
          max-height: 408px;
          overflow: auto;
          padding-right: 2px;
        }

        .activity-item {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          align-items: start;
          padding: 12px 0;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
        }

        .activity-item:first-child {
          border-top: none;
          padding-top: 0;
        }

        .activity-item__icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
        }

        .activity-item__icon--green {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(132, 204, 22, 0.2));
          color: #16a34a;
        }

        .activity-item__icon--violet {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(139, 92, 246, 0.18));
          color: #6d28d9;
        }

        .activity-item__icon--blue {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(37, 99, 235, 0.16));
          color: #2563eb;
        }

        .activity-item__icon--lime {
          background: linear-gradient(135deg, rgba(217, 255, 95, 0.28), rgba(132, 204, 22, 0.18));
          color: #4d7c0f;
        }

        .activity-item__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .activity-item__top p {
          margin: 0;
          color: #0f172a;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .activity-item__top span {
          color: #64748b;
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .activity-item__message {
          margin: 0;
          color: #475569;
          font-size: 0.88rem;
          line-height: 1.5;
          font-style: italic;
        }

        .detail-card__empty {
          min-height: 180px;
          display: grid;
          place-items: center;
          color: #64748b;
          font-size: 0.92rem;
        }

        .activity-list__footer {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
        }

        .activity-list__footer-icon {
          color: #64748b;
        }

        .summary-strip-shell {
          display: grid;
          gap: 12px;
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          border: none;
          background: transparent;
          box-shadow: none;
          overflow: visible;
        }

        .summary-strip__item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.03);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }

        .summary-strip__item:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }

        .summary-strip__icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .summary-strip__icon--green {
          background: rgba(34, 197, 94, 0.14);
          color: #16a34a;
        }

        .summary-strip__icon--orange {
          background: rgba(251, 146, 60, 0.14);
          color: #ea580c;
        }

        .summary-strip__icon--red {
          background: rgba(239, 68, 68, 0.14);
          color: #dc2626;
        }

        .summary-strip__icon--violet {
          background: rgba(139, 92, 246, 0.14);
          color: #7c3aed;
        }

        .summary-strip__icon--blue {
          background: rgba(59, 130, 246, 0.14);
          color: #2563eb;
        }

        .summary-strip p {
          margin: 0 0 4px;
          color: #475569;
          font-size: 0.88rem;
          font-weight: 600;
          font-style: italic;
        }

        .summary-strip strong {
          color: #0f172a;
          font-size: 1.55rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        @media (max-width: 1440px) {
          .kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .analytics-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }

          .analytics-card--wide {
            grid-column: 1 / -1;
          }

          .details-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1120px) {
          .analytics-grid,
          .details-grid {
            grid-template-columns: 1fr;
          }

          .status-panel,
          .status-panel--single {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }

          .summary-strip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 860px) {
          .kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-hero,
          .analytics-card__header,
          .activity-item__top {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .kpi-grid,
          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
