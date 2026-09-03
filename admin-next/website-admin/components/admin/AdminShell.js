'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FileText,
  Files,
  PenLine,
  ReceiptText,
  UserRound,
  TrendingUp,
  PlusCircle,
  Bell,
  X,
} from 'lucide-react';

import LogoutButton from '@/components/admin/LogoutButton';

const sidebarGroups = [
  {
    title: 'Dashboard',
    links: [
      { href: '/admin/website-admin/dashboard', label: 'Home', icon: Home },
    ],
  },
  {
    title: 'Agreements',
    links: [
      { href: '/admin/website-admin/agreements/new', label: 'Create Standard Agreement', icon: FileText },
      { href: '/admin/website-admin/fortnight-agreements/new', label: 'Create Fortnight Agreement', icon: Files },
      { href: '/admin/website-admin/agreements', label: 'Review Agreement', icon: PenLine },
    ],
  },
  {
    title: 'Invoices',
    links: [
      { href: '/admin/website-admin/invoices/new', label: 'Create Invoice', icon: ReceiptText },
      { href: '/admin/website-admin/invoices', label: 'Review Invoice', icon: ReceiptText },
    ],
  },
  {
    title: 'Client Information',
    links: [
      { href: '/admin/website-admin/client-information', label: 'Client Information', icon: UserRound },
    ],
  },
];

const ADMIN_PREFETCH_TARGETS = Array.from(
  new Set([...sidebarGroups.flatMap((group) => group.links.map((link) => link.href)), '/admin/website-admin/invoices/new', '/admin/website-admin/agreements/new'])
);
const NOTIFICATION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'agreement', label: 'Agreement' },
  { key: 'invoice', label: 'Invoices' },
];

function isLinkActive(pathname, href) {
  if (pathname === href) {
    return true;
  }

  if (href === '/admin/website-admin/dashboard' && pathname === '/admin') {
    return true;
  }

  if (href === '/admin/website-admin/agreements/new') {
    return pathname.startsWith('/admin/website-admin/agreements/new') || pathname.startsWith('/admin/website-admin/agreements/') && pathname.endsWith('/edit');
  }

  if (href === '/admin/website-admin/fortnight-agreements/new') {
    return pathname.startsWith('/admin/website-admin/fortnight-agreements/new') || pathname.startsWith('/admin/website-admin/fortnight-agreements/') && pathname.endsWith('/edit');
  }

  if (href === '/admin/website-admin/agreements') {
    return (
      pathname === '/admin/website-admin/agreements' ||
      (/^\/admin\/agreements\/[^/]+$/.test(pathname) && !pathname.endsWith('/new') && !pathname.endsWith('/edit')) ||
      pathname === '/admin/website-admin/fortnight-agreements' ||
      (/^\/admin\/fortnight-agreements\/[^/]+$/.test(pathname) && !pathname.endsWith('/new') && !pathname.endsWith('/edit'))
    );
  }

  if (href === '/admin/website-admin/invoices/new') {
    return pathname.startsWith('/admin/website-admin/invoices/new') || pathname.startsWith('/admin/website-admin/fortnight-invoices/new');
  }

  if (href === '/admin/website-admin/invoices') {
    return (
      pathname === '/admin/website-admin/invoices' ||
      (/^\/admin\/invoices\/[^/]+$/.test(pathname) && !pathname.endsWith('/new') && !pathname.endsWith('/edit')) ||
      pathname === '/admin/website-admin/fortnight-invoices' ||
      (/^\/admin\/fortnight-invoices\/[^/]+$/.test(pathname) && !pathname.endsWith('/new') && !pathname.endsWith('/edit'))
    );
  }

  if (href === '/admin/website-admin/client-information') {
    return pathname === '/admin/website-admin/client-information' || pathname.startsWith('/admin/website-admin/client-information/');
  }

  return false;
}

export default function AdminShell({
  title,
  eyebrow,
  children,
  agreementMetrics = null,
  invoiceMetrics = null,
  clientMetrics = null,
  recentActivityCount = undefined,
  recentActivity = [],
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');

  const filteredNotifications = recentActivity.filter((item) => {
    if (notificationFilter === 'all') {
      return item.category === 'agreement' || item.category === 'invoice';
    }

    if (notificationFilter === 'agreement') {
      return item.category === 'agreement';
    }

    return item.category === 'invoice';
  });

  useEffect(() => {
    const uniqueTargets = ADMIN_PREFETCH_TARGETS.filter((href) => href !== pathname);

    const warmRoutes = () => {
      uniqueTargets.forEach((href) => {
        router.prefetch(href);
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = window.setTimeout(warmRoutes, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  useEffect(() => {
    if (!showNotifications) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications]);

  return (
    <div className={`admin-layout ${showNotifications ? 'admin-layout--notifications-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">9Jobs Admin</div>
        
        <nav className="admin-sidebar__nav">
          {sidebarGroups.map((group) => (
            <div className="admin-sidebar__group" key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => {
                const isActive = isLinkActive(pathname, link.href);
                const LinkIcon = link.icon;
                return (
                  <Link
                    className={`admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`}
                    href={link.href}
                    key={link.href}
                    onMouseEnter={() => router.prefetch(link.href)}
                    onFocus={() => router.prefetch(link.href)}
                  >
                    {LinkIcon && <LinkIcon size={16} strokeWidth={2.2} style={{ marginRight: '12px' }} />}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {agreementMetrics && invoiceMetrics && clientMetrics && (
            <div className="admin-sidebar__summary-widget">
              <div className="summary-widget__header">
                <FileText size={16} className="summary-widget__header-icon" />
                <span>Quick Summary</span>
              </div>
              <div className="summary-widget__body">
                <div className="summary-widget__row">
                  <span className="summary-widget__label">Active Clients</span>
                  <div className="summary-widget__value-container">
                    <span className="summary-widget__value">{clientMetrics.total}</span>
                    <TrendingUp size={14} className="summary-widget__sparkline" />
                  </div>
                </div>
                <div className="summary-widget__row">
                  <span className="summary-widget__label">Pending Agreements</span>
                  <span className="summary-widget__value">{agreementMetrics.pending}</span>
                </div>
                <div className="summary-widget__row">
                  <span className="summary-widget__label">Pending Invoices</span>
                  <span className="summary-widget__value">{invoiceMetrics.pending}</span>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="admin-sidebar__footer">
          <LogoutButton />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar__title">{title}</h1>
            {eyebrow ? <p className="admin-topbar__eyebrow">{eyebrow}</p> : null}
          </div>
          <div className="admin-topbar__actions">
            {recentActivityCount !== undefined && (
              <div className="admin-topbar__notify-container" style={{ position: 'relative' }}>
                <button
                  className="admin-topbar__notify"
                  type="button"
                  aria-label="Recent activity notifications"
                  aria-expanded={showNotifications}
                  onClick={() => {
                    setNotificationFilter('all');
                    setShowNotifications((current) => !current);
                  }}
                >
                  <Bell size={18} strokeWidth={2.3} />
                  {recentActivityCount > 0 ? <span>{recentActivityCount}</span> : null}
                </button>
              </div>
            )}
            <Link
              className="admin-ghost-button admin-ghost-button--link"
              href="/admin/website-admin/invoices/new"
              onMouseEnter={() => router.prefetch('/admin/website-admin/invoices/new')}
              onFocus={() => router.prefetch('/admin/website-admin/invoices/new')}
            >
              <FileText size={16} style={{ marginRight: '8px' }} />
              New Invoice
            </Link>
            <Link
              className="admin-primary-button"
              href="/admin/website-admin/agreements/new"
              onMouseEnter={() => router.prefetch('/admin/website-admin/agreements/new')}
              onFocus={() => router.prefetch('/admin/website-admin/agreements/new')}
            >
              <PlusCircle size={16} style={{ marginRight: '8px' }} />
              New Agreement
            </Link>
          </div>
        </header>

        {children}
      </main>

      {showNotifications ? (
        <>
          <button
            type="button"
            className="admin-notify-overlay"
            aria-label="Close notifications"
            onClick={() => setShowNotifications(false)}
          />
          <aside className="admin-notify-drawer" aria-label="Notifications">
            <div className="admin-notify-drawer__header">
              <div>
                <h3>Notifications</h3>
                <p>Track agreement signatures and successful invoice payments.</p>
              </div>
              <button
                type="button"
                className="admin-notify-drawer__close"
                aria-label="Close notifications"
                onClick={() => setShowNotifications(false)}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <div className="admin-notify-drawer__filters">
              {NOTIFICATION_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`admin-notify-drawer__filter ${notificationFilter === filter.key ? 'admin-notify-drawer__filter--active' : ''}`}
                  onClick={() => setNotificationFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="admin-notify-drawer__body">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((act) => (
                  <div
                    key={act.key}
                    className={`admin-notify-drawer__item ${act.url ? 'admin-notify-drawer__item--clickable' : ''}`}
                    onClick={() => {
                      if (act.url) {
                        router.push(act.url);
                      }
                      setShowNotifications(false);
                    }}
                  >
                    <div className="admin-notify-drawer__item-meta">
                      <span className="admin-notify-drawer__item-badge">{act.badge || 'Notification'}</span>
                      <span>
                        {act.timestamp
                          ? new Date(act.timestamp).toLocaleString([], {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : ''}
                      </span>
                    </div>
                    <strong>{act.title}</strong>
                    <p>{act.message}</p>
                  </div>
                ))
              ) : (
                <div className="admin-notify-drawer__empty">No notifications available for this section.</div>
              )}
            </div>
          </aside>
        </>
      ) : null}

      <style jsx global>{`
        .admin-layout--notifications-open .admin-main,
        .admin-layout--notifications-open .admin-sidebar {
          filter: blur(3px);
          transition: filter 0.2s ease;
        }

        .admin-sidebar__link {
          display: flex;
          align-items: center;
        }
        
        .admin-topbar__actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-topbar__title {
          margin: 0;
          color: #0f172a;
          font-size: clamp(2.2rem, 3.8vw, 3.35rem);
          line-height: 1.02;
          letter-spacing: -0.05em;
          font-style: italic;
          font-weight: 800;
          text-wrap: balance;
        }

        .admin-ghost-button--link, .admin-primary-button {
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13.5px;
          height: 42px;
          padding: 0 16px;
        }

        .admin-ghost-button--link {
          border: 1px solid rgba(15, 23, 42, 0.15);
          background: #fff;
          color: #0f172a;
        }

        .admin-primary-button {
          background: #d9ff5f;
          color: #0f172a;
          border: none;
          box-shadow: 0 4px 12px rgba(217, 255, 95, 0.25);
        }

        .admin-primary-button:hover {
          background: #cbf24b;
        }

        .admin-topbar__notify {
          position: relative;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 12px;
          background: #fff;
          color: #0f172a;
          display: grid;
          place-items: center;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.04);
          cursor: pointer;
          margin-right: 8px;
        }

        .admin-topbar__notify span {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 0.65rem;
          font-weight: 800;
          border: 2px solid #fff;
        }

        .admin-notify-overlay {
          position: fixed;
          inset: 0;
          border: none;
          background: rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(10px);
          z-index: 120;
          cursor: pointer;
        }

        .admin-notify-drawer {
          position: fixed;
          top: 20px;
          right: 20px;
          bottom: 20px;
          width: min(420px, calc(100vw - 24px));
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 28px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
          z-index: 130;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .admin-notify-drawer__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 22px 22px 16px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
        }

        .admin-notify-drawer__header h3 {
          margin: 0;
          font-size: 1.05rem;
          color: #0f172a;
          font-weight: 800;
        }

        .admin-notify-drawer__header p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.45;
        }

        .admin-notify-drawer__close {
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #fff;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          border-radius: 999px;
          width: 36px;
          height: 36px;
          padding: 0;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }

        .admin-notify-drawer__close:hover {
          border-color: rgba(148, 163, 184, 0.32);
        }

        .admin-notify-drawer__filters {
          display: flex;
          gap: 10px;
          padding: 16px 22px 14px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
        }

        .admin-notify-drawer__filter {
          height: 38px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #fff;
          color: #334155;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-notify-drawer__filter--active {
          background: #d9ff5f;
          border-color: rgba(132, 204, 22, 0.35);
          color: #0f172a;
        }

        .admin-notify-drawer__body {
          flex: 1;
          overflow-y: auto;
          padding: 14px 14px 18px;
        }

        .admin-notify-drawer__item {
          padding: 16px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 18px;
          background: #fff;
          margin-bottom: 12px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .admin-notify-drawer__item--clickable {
          cursor: pointer;
        }

        .admin-notify-drawer__item--clickable:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
          border-color: rgba(132, 204, 22, 0.28);
        }

        .admin-notify-drawer__item-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .admin-notify-drawer__item-meta span {
          color: #64748b;
          font-size: 0.75rem;
        }

        .admin-notify-drawer__item-badge {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(217, 255, 95, 0.2);
          color: #4d7c0f !important;
          font-weight: 800;
        }

        .admin-notify-drawer__item strong {
          display: block;
          color: #0f172a;
          font-size: 0.92rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .admin-notify-drawer__item p {
          margin: 0;
          color: #475569;
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .admin-notify-drawer__empty {
          padding: 30px;
          text-align: center;
          color: #64748b;
          font-size: 0.88rem;
        }

        .admin-sidebar__summary-widget {
          margin-top: auto;
          margin-bottom: 12px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .summary-widget__header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 14px;
        }

        .summary-widget__header-icon {
          color: #84cc16;
        }

        .summary-widget__body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-widget__row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-widget__label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
        }

        .summary-widget__value-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .summary-widget__value {
          color: #f8fafc;
          font-size: 13px;
          font-weight: 700;
        }

        .summary-widget__sparkline {
          color: #84cc16;
        }

        @media (max-width: 720px) {
          .admin-notify-drawer {
            top: 12px;
            right: 12px;
            bottom: 12px;
            width: calc(100vw - 24px);
          }

          .admin-notify-drawer__header {
            padding: 18px 18px 14px;
          }

          .admin-notify-drawer__filters {
            padding: 14px 18px 12px;
            overflow-x: auto;
          }

          .admin-notify-drawer__body {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
