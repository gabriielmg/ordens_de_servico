export function AppSkeleton() {
  return (
    <div className="app-shell">
      <div className="topbar-shell">
        <div className="topbar topbar-skeleton">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-chip" />
        </div>
      </div>

      <main className="app-content">
        <section className="hero-panel skeleton-panel">
          <div className="skeleton-stack">
            <div className="skeleton-line skeleton-eyebrow" />
            <div className="skeleton-line skeleton-heading" />
            <div className="skeleton-line" />
          </div>
          <div className="stats-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="stat-card skeleton-card" />
            ))}
          </div>
        </section>

        <section className="filters-panel skeleton-panel">
          <div className="skeleton-line skeleton-heading" />
          <div className="chip-set">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton-chip" />
            ))}
          </div>
        </section>

        <section className="orders-panel skeleton-panel">
          <div className="section-heading">
            <div className="skeleton-stack">
              <div className="skeleton-line skeleton-eyebrow" />
              <div className="skeleton-line skeleton-heading" />
            </div>
          </div>

          <div className="orders-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="order-card skeleton-card">
                <div className="skeleton-line skeleton-chip-line" />
                <div className="skeleton-stack">
                  <div className="skeleton-line skeleton-title" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-short" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
