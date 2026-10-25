export default function OverviewTab({
  stats,
  recentActivity = [],
  pendingUpdates = [],
  onNavigateTab,
  onOpenImportModal,
  company,
  roleMode,
  currentUser,
  isMasterAdmin = false,
}) {
  return (
    <div className="product-network-overview">
      {/* Welcome Banner */}
      <div
        className="card border-0 rounded-4 p-4 text-white mb-4 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #172554 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        }}
      >
        <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
          <div>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-2 rounded-pill bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30" style={{ fontSize: '11.5px', fontWeight: 700 }}>
              <span>⚡ TREAD B2B ECOSYSTEM</span>
              <span className="badge bg-warning text-dark" style={{ fontSize: '9px' }}>PAID &amp; PROTECTED DATA</span>
            </div>
            <h2 className="h4 fw-bold mb-1 text-white">
              {company?.name ? `${company.name} • ` : ''}TREAD Product Network
            </h2>
            <p className="text-white-50 small mb-0" style={{ maxWidth: '640px', lineHeight: '1.5' }}>
              Connect directly with verified national manufacturers and authorized brands. Catalogs are licensed paid data packages curated and unlocked by the <strong>Master Admin</strong>. Pre-verified HSN codes, GST tax slabs, and real-time prices sync non-destructively with your billing inventory.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-warning text-dark fw-bold px-3 py-2 d-flex align-items-center gap-2 shadow-sm"
              onClick={() => onNavigateTab('discover')}
            >
              <span>🔍</span>
              <span>Discover Products</span>
            </button>

            {isMasterAdmin && (
              <button
                type="button"
                className="btn btn-outline-warning text-warning fw-bold px-3 py-2 d-flex align-items-center gap-2"
                onClick={() => onNavigateTab('admin_access')}
              >
                <span>🛡️</span>
                <span>Admin Access Console</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline-light px-3 py-2 fw-semibold d-flex align-items-center gap-2"
              onClick={() => onNavigateTab('connections')}
            >
              <span>🤝</span>
              <span>Connect Manufacturer</span>
            </button>
            <button
              type="button"
              className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
              onClick={onOpenImportModal}
            >
              <span>📥</span>
              <span>Import Catalog (AI)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Quick Callout (if logged in as admin) */}
      {isMasterAdmin && (
        <div
          className="alert alert-dark border-primary d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 shadow-xs mb-4 text-white"
          style={{ background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)' }}
          role="alert"
        >
          <div className="d-flex align-items-center gap-3 mb-2 mb-md-0">
            <span className="fs-3">🛡️</span>
            <div>
              <strong className="d-block text-warning">
                Master Admin Access Manager &bull; {stats.pendingRequests || 0} Pending Requests
              </strong>
              <span className="small text-white-50">
                You control company access to paid catalogs. Grant licenses, approve company requests, or revoke permissions.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-warning text-dark fw-bold px-3 py-2 align-self-start align-self-md-center text-nowrap"
            onClick={() => onNavigateTab('admin_access')}
          >
            Manage Company Grants &rarr;
          </button>
        </div>
      )}

      {/* Regular User Paid Notice Banner */}
      {!isMasterAdmin && stats.activePaidCatalogs === 0 && (
        <div
          className="alert alert-warning border-warning d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 shadow-xs mb-4"
          role="alert"
        >
          <div className="d-flex align-items-center gap-3 mb-2 mb-md-0">
            <span className="fs-3">🔒</span>
            <div>
              <strong className="d-block text-dark">
                Paid Catalog Access Required
              </strong>
              <span className="small text-muted">
                Your account currently has no active paid catalog grants. The Admin user will add access for your License ID (<strong>{currentUser?.licenseId || 'Pending'}</strong>).
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-dark text-warning fw-bold px-3 py-2 align-self-start align-self-md-center text-nowrap"
            onClick={() => onNavigateTab('discover')}
          >
            Browse &amp; Request Activation &rarr;
          </button>
        </div>
      )}

      {/* Pending Updates Callout Alert */}
      {pendingUpdates.length > 0 && (
        <div
          className="alert alert-info border-info d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 shadow-xs mb-4"
          role="alert"
        >
          <div className="d-flex align-items-center gap-3 mb-2 mb-md-0">
            <span className="fs-3">🔔</span>
            <div>
              <strong className="d-block text-dark">
                {pendingUpdates.length} Manufacturer Catalog {pendingUpdates.length === 1 ? 'Update' : 'Updates'} Pending Review
              </strong>
              <span className="small text-muted">
                Participating manufacturers have published newer product revisions or price updates. Review and accept changes non-destructively.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-dark text-info fw-bold px-3 py-2 align-self-start align-self-md-center text-nowrap"
            onClick={() => onNavigateTab('updates')}
          >
            Review Catalog Updates &rarr;
          </button>
        </div>
      )}

      {/* 6 Key KPI Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Active Paid Catalogs */}
        <div className="col-xl-2 col-md-4 col-sm-6">
          <div
            className="card border-0 rounded-3 p-3 shadow-sm h-100 bg-white"
            style={{ borderLeft: '4px solid #16a34a' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                Paid Grants
              </span>
              <span className="badge bg-success bg-opacity-10 text-success">
                {isMasterAdmin ? 'Admin' : 'My Account'}
              </span>
            </div>
            <div className="fs-3 fw-bold text-success font-monospace">
              {stats.activePaidCatalogs}
            </div>
            <span className="small text-muted" style={{ fontSize: '11.5px' }}>
              Active Paid Catalogs
            </span>
          </div>
        </div>

        {/* Card 2: Total Network Catalogs */}
        <div className="col-xl-2 col-md-4 col-sm-6">
          <div
            className="card border-0 rounded-3 p-3 shadow-sm h-100 bg-white"
            style={{ borderLeft: '4px solid #2563eb' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                Master Catalogs
              </span>
              <span className="badge bg-primary bg-opacity-10 text-primary">Network</span>
            </div>
            <div className="fs-3 fw-bold text-dark font-monospace">
              {stats.availableCatalogs}
            </div>
            <span className="small text-muted" style={{ fontSize: '11.5px' }}>
              Total Network Catalogs
            </span>
          </div>
        </div>

        {/* Card 3: Products in My Stock */}
        <div className="col-xl-2 col-md-4 col-sm-6">
          <div
            className="card border-0 rounded-3 p-3 shadow-sm h-100 bg-white"
            style={{ borderLeft: '4px solid #0891b2' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                My Inventory
              </span>
              <span className="badge bg-info bg-opacity-10 text-info">Synced</span>
            </div>
            <div className="fs-3 fw-bold text-dark font-monospace">
              {stats.importedProducts}
            </div>
            <span className="small text-muted" style={{ fontSize: '11.5px' }}>
              Imported into My Stock
            </span>
          </div>
        </div>

        {/* Card 4: Connected Manufacturers */}
        <div className="col-xl-2 col-md-4 col-sm-6">
          <div
            className="card border-0 rounded-3 p-3 shadow-sm h-100 bg-white"
            style={{ borderLeft: '4px solid #7c3aed' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                Partners
              </span>
              <span className="badge bg-secondary bg-opacity-10 text-dark">Approved</span>
            </div>
            <div className="fs-3 fw-bold text-dark font-monospace">
              {stats.connectedManufacturers}
            </div>
            <span className="small text-muted" style={{ fontSize: '11.5px' }}>
              Connected Brands
            </span>
          </div>
        </div>

        {/* Card 5: Pending Updates */}
        <div className="col-xl-2 col-md-4 col-sm-6">
          <div
            className="card border-0 rounded-3 p-3 shadow-sm h-100 bg-white"
            style={{ borderLeft: '4px solid #d97706' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                Revisions
              </span>
              <span className="badge bg-warning bg-opacity-20 text-warning">Diffs</span>
            </div>
            <div className="fs-3 fw-bold text-warning font-monospace">
              {stats.pendingUpdates}
            </div>
            <span className="small text-muted" style={{ fontSize: '11.5px' }}>
              Pending Version Diffs
            </span>
          </div>
        </div>

        {/* Card 6: Pending License Requests */}
        <div className="col-xl-2 col-md-4 col-sm-6">
          <div
            className="card border-0 rounded-3 p-3 shadow-sm h-100 bg-white"
            style={{ borderLeft: '4px solid #dc2626' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                Requests
              </span>
              <span className="badge bg-danger bg-opacity-10 text-danger">Activation</span>
            </div>
            <div className="fs-3 fw-bold font-monospace text-dark">
              {stats.pendingRequests || 0}
            </div>
            <span className="small text-muted" style={{ fontSize: '11.5px' }}>
              Pending License Requests
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Quick Navigation */}
      <div className="row g-4">
        {/* Left Column: Recent Activity Feed */}
        <div className="col-lg-8">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '16px' }}>
                  Recent Network Activity &amp; Audit Trail
                </h5>
                <span className="small text-muted">
                  Real-time events across catalogs, manufacturer connections, and inventory synchronizations.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => onNavigateTab('history')}
              >
                View Full Logs
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                No recent network actions recorded.
              </div>
            ) : (
              <div className="activity-timeline">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="d-flex align-items-start gap-3 py-2 border-bottom border-light"
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                      style={{
                        width: '34px',
                        height: '34px',
                        background:
                          act.action.includes('APPROVED') || act.action.includes('SUCCESS')
                            ? 'rgba(16, 185, 129, 0.12)'
                            : act.action.includes('PUBLISHED')
                            ? 'rgba(37, 99, 235, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                        color:
                          act.action.includes('APPROVED') || act.action.includes('SUCCESS')
                            ? '#059669'
                            : act.action.includes('PUBLISHED')
                            ? '#2563eb'
                            : '#d97706',
                        fontSize: '15px',
                      }}
                    >
                      {act.action.includes('APPROVED') ? '✓' : act.action.includes('PUBLISHED') ? '📦' : '⚡'}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-baseline">
                        <span className="fw-semibold text-dark small">
                          {act.actor} &bull; <span className="text-primary">{act.target}</span>
                        </span>
                        <span className="small text-muted font-monospace" style={{ fontSize: '11px' }}>
                          {new Date(act.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-muted small mb-0 mt-0" style={{ fontSize: '12.5px' }}>
                        {act.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Ecosystem Overview & Shortcuts */}
        <div className="col-lg-4">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
            <h5 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>
              Product Network Navigation
            </h5>

            <div className="list-group list-group-flush small">
              {isMasterAdmin && (
                <div
                  className="list-group-item px-0 py-2 border-bottom d-flex align-items-center justify-content-between text-primary fw-bold"
                  role="button"
                  onClick={() => onNavigateTab('admin_access')}
                >
                  <div>
                    <div>🛡️ Admin Access Console</div>
                    <div className="text-muted fw-normal" style={{ fontSize: '11.5px' }}>Grant paid catalog licenses to companies</div>
                  </div>
                  <span>&rarr;</span>
                </div>
              )}

              <div
                className="list-group-item px-0 py-2 border-bottom d-flex align-items-center justify-content-between"
                role="button"
                onClick={() => onNavigateTab('discover')}
              >
                <div>
                  <div className="fw-semibold text-dark">Discover Marketplace</div>
                  <div className="text-muted" style={{ fontSize: '11.5px' }}>Search products by SKU, HSN, &amp; brand</div>
                </div>
                <span className="text-muted">&rarr;</span>
              </div>

              <div
                className="list-group-item px-0 py-2 border-bottom d-flex align-items-center justify-content-between"
                role="button"
                onClick={() => onNavigateTab('imports')}
              >
                <div>
                  <div className="fw-semibold text-dark">My Catalog Imports</div>
                  <div className="text-muted" style={{ fontSize: '11.5px' }}>Mapped local items with preserved rates</div>
                </div>
                <span className="text-muted">&rarr;</span>
              </div>

              <div
                className="list-group-item px-0 py-2 border-bottom d-flex align-items-center justify-content-between"
                role="button"
                onClick={() => onNavigateTab('connections')}
              >
                <div>
                  <div className="fw-semibold text-dark">Manufacturer Connections</div>
                  <div className="text-muted" style={{ fontSize: '11.5px' }}>Permission-based B2B partnerships</div>
                </div>
                <span className="text-muted">&rarr;</span>
              </div>

              <div
                className="list-group-item px-0 py-2 d-flex align-items-center justify-content-between"
                role="button"
                onClick={() => onNavigateTab('updates')}
              >
                <div>
                  <div className="fw-semibold text-dark">Catalog Updates &amp; Diffs</div>
                  <div className="text-muted" style={{ fontSize: '11.5px' }}>Side-by-side version comparison</div>
                </div>
                <span className="text-muted">&rarr;</span>
              </div>
            </div>
          </div>

          {/* Paid Architecture & Company Isolation Guarantee Box */}
          <div
            className="card border-0 rounded-4 p-3 shadow-sm text-dark"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
            }}
          >
            <div className="d-flex align-items-start gap-2">
              <span className="fs-5 text-success">🛡️</span>
              <div>
                <strong className="d-block small text-success fw-bold">Paid &amp; Admin-Governed Architecture</strong>
                <p className="small text-dark text-opacity-75 mb-0" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                  Product data is not self-generated. Master manufacturer catalogs are paid assets activated on a per-license basis by the Administrator. Your local inventory quantities and custom pricing remain 100% private.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
