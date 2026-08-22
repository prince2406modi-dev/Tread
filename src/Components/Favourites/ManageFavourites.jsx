function ManageFavourites({
  allOptions = [],
  favourites = [],
  onToggleFavourite,
  onNavigate,
  onBack
}) {
  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">⭐ Manage Favourites & Quick Access</h1>
          <p className="text-muted mb-0">
            Pin frequently used menus and tools to your top navigation bar for 1-click access.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h2 className="h5 mb-0 fw-bold">Pinned Shortcut Options</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {allOptions.map((item) => {
              const isFav = favourites.includes(item.name);
              return (
                <div className="col-12 col-md-6 col-lg-4" key={item.name}>
                  <div
                    className={`card h-100 border p-3 d-flex flex-row justify-content-between align-items-center ${
                      isFav ? 'border-primary bg-light' : 'border-light'
                    }`}
                  >
                    <div>
                      <div className="fw-bold">{item.icon} {item.name}</div>
                      <small className="text-muted">{item.category}</small>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      <button
                        type="button"
                        className={`btn btn-sm ${isFav ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                        onClick={() => onToggleFavourite(item.name)}
                        title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        {isFav ? '★ Pinned' : '☆ Pin'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onNavigate(item.name)}
                        title="Open page"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageFavourites;
