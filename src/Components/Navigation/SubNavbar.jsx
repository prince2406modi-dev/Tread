export default function SubNavbar({
  currentUser,
  company,
  activePage,
  onClosePage,
  recognitionActive,
  favourites,
  onSelectFavourite,
  cloudSyncStatus,
  lastSyncTime,
  onOpenCloudSync,
  onInitiateLogout,
}) {
  return (
    <div className="sub-navbar">
      <div className="breadcrumb-tag">
        <span>📁 {company?.name || 'Tread'}</span>
        {currentUser && activePage && (
          <>
            <span className="text-muted">/</span>
            <span className="active-page-name">{activePage}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2 ms-2 fw-semibold"
              style={{ fontSize: '11px', borderRadius: '4px' }}
              onClick={onClosePage}
              title="Close screen (Esc)"
            >
              ✕ Close
            </button>
          </>
        )}
        {!currentUser && (
          <>
            <span className="text-muted">/</span>
            <span className="active-page-name">Authentication Required</span>
          </>
        )}
        {currentUser && recognitionActive && (
          <span className="badge bg-danger animate-pulse ms-2">
            ● Voice Active
          </span>
        )}
      </div>

      {/* Quick Favourites Pills (Desktop/Tablet) */}
      {currentUser && (
        <div className="favourites-pills d-none d-md-flex">
          <span className="text-muted small me-1">⭐ Quick:</span>
          {favourites.map((fav) => (
            <button
              key={fav}
              type="button"
              className={`fav-pill-btn ${activePage === fav ? 'active' : ''}`}
              onClick={() => onSelectFavourite(fav)}
            >
              {fav}
            </button>
          ))}
        </div>
      )}

      {/* User Account & Quick Status */}
      <div className="d-flex align-items-center gap-2">
        {currentUser ? (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* On-Demand Cloud Sync Button */}
            <button
              type="button"
              className="btn btn-sm btn-light border py-0 px-2 d-flex align-items-center gap-1 shadow-xs"
              style={{ fontSize: '11.5px' }}
              onClick={onOpenCloudSync}
              title={`On-Demand Cloud Sync (Last: ${lastSyncTime || 'Never'}). Click to open sync panel.`}
            >
              {cloudSyncStatus === 'syncing' ? (
                <span className="text-primary fw-semibold">⏳ Syncing...</span>
              ) : cloudSyncStatus === 'error' ? (
                <span className="text-danger fw-semibold">⚠️ Sync Error</span>
              ) : (
                <span className="text-dark fw-medium">
                  ☁️ Sync {lastSyncTime ? `(${lastSyncTime})` : 'Now'}
                </span>
              )}
            </button>

            <span className="badge bg-primary text-white py-1 px-2 fw-semibold">
              👤 {currentUser.username}
            </span>

            <button
              type="button"
              className="btn btn-sm btn-outline-danger py-0 px-2 fw-semibold"
              style={{ fontSize: '11px' }}
              onClick={onInitiateLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <span className="badge bg-warning text-dark border py-1 px-2">
            🔒 Sign In Required
          </span>
        )}
      </div>
    </div>
  );
}
