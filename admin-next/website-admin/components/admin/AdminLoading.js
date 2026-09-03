const sidebarGroups = [
  {
    title: 'Dashboard',
    links: ['Home'],
  },
  {
    title: 'Agreements',
    links: ['Create Standard Agreement', 'Create Fortnight Agreement', 'Review Agreement'],
  },
  {
    title: 'Invoices',
    links: ['Create Invoice', 'Review Invoice'],
  },
  {
    title: 'Client Information',
    links: ['Client Information'],
  },
];

function SkeletonLine({ className = '' }) {
  return <div className={`admin-skeleton ${className}`.trim()} aria-hidden="true" />;
}

function SidebarSkeleton() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">9Jobs Admin</div>

      <nav className="admin-sidebar__nav" aria-hidden="true">
        {sidebarGroups.map((group) => (
          <div className="admin-sidebar__group" key={group.title}>
            <h3>{group.title}</h3>
            {group.links.map((label) => (
              <div className="admin-sidebar__link" key={label}>
                <SkeletonLine className="admin-skeleton--sidebar-link" />
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <SkeletonLine className="admin-skeleton--button admin-skeleton--button-small" />
      </div>
    </aside>
  );
}

export function AdminShellLoading({ titleWidth = '320px', eyebrowWidth = '220px', children }) {
  return (
    <div className="admin-layout">
      <SidebarSkeleton />
      <main className="admin-main">
        <header className="admin-topbar" aria-hidden="true">
          <div>
            <SkeletonLine className="admin-skeleton--title" style={{ width: titleWidth }} />
            <SkeletonLine className="admin-skeleton--text" style={{ width: eyebrowWidth, marginTop: '10px' }} />
          </div>
          <div className="admin-topbar__actions">
            <SkeletonLine className="admin-skeleton--button admin-skeleton--button-small" />
            <SkeletonLine className="admin-skeleton--button" />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export function AdminPanelSkeleton({
  rows = 5,
  columns = 6,
  hasHeaderActions = true,
  hasTable = true,
}) {
  const columnCount = Math.max(columns, 1);

  return (
    <section className="admin-panel" aria-hidden="true">
      <div className="admin-panel__header">
        <div>
          <SkeletonLine className="admin-skeleton--section-title" />
          <SkeletonLine className="admin-skeleton--text" style={{ width: '360px', marginTop: '10px' }} />
        </div>
        {hasHeaderActions ? (
          <div className="admin-actions-row">
            <SkeletonLine className="admin-skeleton--button" />
          </div>
        ) : null}
      </div>

      {hasTable ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--skeleton">
            <thead>
              <tr>
                {Array.from({ length: columnCount }).map((_, index) => (
                  <th key={index}>
                    <SkeletonLine className="admin-skeleton--table-head" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columnCount }).map((__, columnIndex) => (
                    <td key={columnIndex}>
                      <SkeletonLine className="admin-skeleton--table-line" />
                      {columnIndex === 0 || columnIndex === 1 ? (
                        <SkeletonLine className="admin-skeleton--table-subline" />
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function AdminDetailSkeleton() {
  return (
    <>
      <section className="admin-panel" aria-hidden="true">
        <div className="admin-panel__header">
          <div>
            <SkeletonLine className="admin-skeleton--section-title" />
            <SkeletonLine className="admin-skeleton--text" style={{ width: '280px', marginTop: '10px' }} />
          </div>
          <SkeletonLine className="admin-skeleton--badge" />
        </div>

        <div className="admin-actions-row" style={{ marginBottom: '20px' }}>
          <SkeletonLine className="admin-skeleton--button" />
          <SkeletonLine className="admin-skeleton--button" />
          <SkeletonLine className="admin-skeleton--button" />
        </div>

        <div className="admin-detail-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="admin-detail-card" key={index}>
              <SkeletonLine className="admin-skeleton--card-title" />
              <SkeletonLine className="admin-skeleton--detail-row" />
              <SkeletonLine className="admin-skeleton--detail-row" />
              <SkeletonLine className="admin-skeleton--detail-row" />
            </div>
          ))}
        </div>
      </section>

      <section className="admin-preview-layout" aria-hidden="true">
        <article className="admin-panel admin-preview-panel">
          <div className="admin-panel__header">
            <div>
              <SkeletonLine className="admin-skeleton--section-title" />
              <SkeletonLine className="admin-skeleton--text" style={{ width: '320px', marginTop: '10px' }} />
            </div>
            <SkeletonLine className="admin-skeleton--button admin-skeleton--button-small" />
          </div>

          <SkeletonLine className="admin-skeleton--frame" />
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <SkeletonLine className="admin-skeleton--section-title" />
              <SkeletonLine className="admin-skeleton--text" style={{ width: '260px', marginTop: '10px' }} />
            </div>
            <SkeletonLine className="admin-skeleton--button admin-skeleton--button-small" />
          </div>

          <div className="admin-timeline">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="admin-timeline__item" key={index}>
                <SkeletonLine className="admin-skeleton--detail-row" />
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

export function AdminHomeSkeleton() {
  return (
    <section className="admin-home-hero" aria-hidden="true">
      <div className="admin-home-hero__glow admin-home-hero__glow--left" />
      <div className="admin-home-hero__glow admin-home-hero__glow--right" />

      <div className="admin-home-hero__content">
        <SkeletonLine className="admin-skeleton--hero-title" />
        <SkeletonLine className="admin-skeleton--hero-text" />
        <div className="admin-home-hero__ticker">
          <SkeletonLine className="admin-skeleton--chip" />
          <SkeletonLine className="admin-skeleton--chip" />
          <SkeletonLine className="admin-skeleton--chip" />
          <SkeletonLine className="admin-skeleton--chip" />
        </div>
      </div>
    </section>
  );
}
