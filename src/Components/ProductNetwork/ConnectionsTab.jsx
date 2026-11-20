import { useState, useMemo } from 'react';

export default function ConnectionsTab({
  manufacturers = [],
  onRequestConnection,
  onApproveConnection,
  onRevokeConnection,
  onUpdatePermissionTier,
  company,
}) {
  const [activeSubTab, setActiveSubTab] = useState('directory'); // 'directory' | 'connected' | 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [requestModalMfr, setRequestModalMfr] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [permissionModalMfr, setPermissionModalMfr] = useState(null);

  // Filtered manufacturers
  const filteredList = useMemo(() => {
    return manufacturers.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.brandName && m.brandName.toLowerCase().includes(q)) ||
        (m.gstin && m.gstin.toLowerCase().includes(q)) ||
        (m.city && m.city.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q));

      const matchCat = !filterCategory || m.category === filterCategory;

      if (activeSubTab === 'connected') {
        return matchSearch && matchCat && m.connectionStatus === 'approved';
      }
      if (activeSubTab === 'requests') {
        return matchSearch && matchCat && m.connectionStatus === 'pending';
      }
      return matchSearch && matchCat;
    });
  }, [manufacturers, searchQuery, filterCategory, activeSubTab]);

  const stats = useMemo(() => {
    return {
      total: manufacturers.length,
      approved: manufacturers.filter((m) => m.connectionStatus === 'approved').length,
      pending: manufacturers.filter((m) => m.connectionStatus === 'pending').length,
    };
  }, [manufacturers]);

  // Handle send connection request
  const handleSendRequest = (e) => {
    e.preventDefault();
    if (!requestModalMfr) return;
    onRequestConnection(requestModalMfr.id, requestNote);
    setRequestModalMfr(null);
    setRequestNote('');
    alert(`✓ Connection request sent to ${requestModalMfr.name}!`);
  };

  return (
    <div className="connections-tab">
      {/* Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            Manufacturer Connections &amp; Brand Authorization
          </h4>
          <span className="small text-muted">
            Establish permission-based partnerships to access restricted wholesale catalogs, confidential price tiers, and direct version updates.
          </span>
        </div>

        {/* Sub-Tabs Pills */}
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className={`btn ${activeSubTab === 'directory' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('directory')}
          >
            All Manufacturers ({stats.total})
          </button>
          <button
            type="button"
            className={`btn ${activeSubTab === 'connected' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('connected')}
          >
            Connected ({stats.approved})
          </button>
          <button
            type="button"
            className={`btn ${activeSubTab === 'requests' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('requests')}
          >
            Pending Requests ({stats.pending})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card border-0 rounded-4 shadow-sm p-3 bg-white mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-7">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">🔍</span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search manufacturers by company name, brand, GSTIN, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-5">
            <select
              className="form-select form-select-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Industry Verticals</option>
              {[...new Set(manufacturers.map((m) => m.category))].filter(Boolean).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Manufacturers Cards Grid */}
      {filteredList.length === 0 ? (
        <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
          <span className="fs-1 text-muted d-block mb-2">🤝</span>
          <h5 className="fw-bold text-dark">No Manufacturers Found</h5>
          <p className="small text-muted mb-0">
            No participating brand matched the selected filters.
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredList.map((mfr) => {
            const isApproved = mfr.connectionStatus === 'approved';
            const isPending = mfr.connectionStatus === 'pending';

            return (
              <div key={mfr.id} className="col-lg-6">
                <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    {/* Top Row: Logo & Badges */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={mfr.logoUrl || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100&auto=format&fit=crop&q=60'}
                          alt={mfr.name}
                          className="rounded-3 border flex-shrink-0"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '15px' }}>
                              {mfr.name}
                            </h5>
                            {mfr.verified && (
                              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style={{ fontSize: '10px' }}>
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <span className="small text-muted font-monospace" style={{ fontSize: '11px' }}>
                            GSTIN: {mfr.gstin} &bull; {mfr.city}, {mfr.state}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isApproved ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                          ✓ Connected
                        </span>
                      ) : isPending ? (
                        <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 px-2 py-1">
                          ⏳ Pending Approval
                        </span>
                      ) : (
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">
                          Not Connected
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-muted small mb-3" style={{ fontSize: '12.5px', lineHeight: '1.5' }}>
                      {mfr.description}
                    </p>

                    {/* Stats Strip */}
                    <div className="p-2 bg-light rounded-3 d-flex justify-content-around text-center small mb-3 border">
                      <div>
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>Industry</span>
                        <strong className="text-dark">{mfr.category}</strong>
                      </div>
                      <div className="border-start border-end px-3">
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>Catalogs</span>
                        <strong className="text-primary">{mfr.catalogsCount} Active</strong>
                      </div>
                      <div>
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>Access Tier</span>
                        <strong className="text-dark text-capitalize">{mfr.permissionTier || 'Standard'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                    <span className="small text-muted" style={{ fontSize: '11.5px' }}>
                      {mfr.contactPhone} &bull; {mfr.contactEmail}
                    </span>

                    <div className="d-flex gap-2">
                      {isApproved ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setPermissionModalMfr(mfr)}
                          >
                            Permissions
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              if (window.confirm(`Revoke catalog access from ${mfr.name}?`)) {
                                onRevokeConnection(mfr.id);
                              }
                            }}
                          >
                            Revoke
                          </button>
                        </>
                      ) : isPending ? (
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-success fw-semibold"
                            onClick={() => onApproveConnection(mfr.id)}
                          >
                            Approve Access
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => onRevokeConnection(mfr.id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary fw-semibold px-3"
                          onClick={() => setRequestModalMfr(mfr)}
                        >
                          🤝 Request Connection
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Request Connection */}
      {requestModalMfr && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  🤝 Request Partnership with {requestModalMfr.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setRequestModalMfr(null)} />
              </div>
              <form onSubmit={handleSendRequest}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="small text-muted">Applying Business Profile:</div>
                    <div className="fw-bold text-dark">{company?.name || 'My Business Enterprise'}</div>
                    <div className="small text-muted font-monospace mt-1">
                      GSTIN: {company?.gstin || '27AAAAA0000A1Z5'} &bull; Phone: {company?.phone || 'N/A'}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">
                      Partnership Note / Distributor Brief *
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Introduce your distribution network, retail territory, or expected order volume..."
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      required
                    />
                  </div>

                  <p className="small text-muted mb-0">
                    Once approved by {requestModalMfr.name}, confidential dealer price lists, volume discounts, and automatic version updates will become immediately accessible in your TREAD portal.
                  </p>
                </div>
                <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setRequestModalMfr(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold px-4">
                    Send Formal Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Manage Permission Tier */}
      {permissionModalMfr && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  ⚙️ Catalog Sharing Permission Tier
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPermissionModalMfr(null)} />
              </div>
              <div className="modal-body p-4">
                <div className="small text-muted mb-2">Partner:</div>
                <h6 className="fw-bold text-dark mb-3">{permissionModalMfr.name}</h6>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Authorized Price Tier</label>
                  <select
                    className="form-select"
                    value={permissionModalMfr.permissionTier || 'standard'}
                    onChange={(e) => {
                      onUpdatePermissionTier(permissionModalMfr.id, e.target.value);
                      setPermissionModalMfr({ ...permissionModalMfr, permissionTier: e.target.value });
                    }}
                  >
                    <option value="full">Full Access (All Catalogs + Tier A Wholesale Discounts)</option>
                    <option value="standard">Standard Wholesale (Published Catalogs + General Wholesale)</option>
                    <option value="restricted">Restricted (Public Catalogs Only)</option>
                  </select>
                </div>

                <div className="alert alert-info small mb-0">
                  ℹ️ Role-based authorization ensures private dealer contracts remain confidential between trading partners.
                </div>
              </div>
              <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-end">
                <button type="button" className="btn btn-primary px-4" onClick={() => setPermissionModalMfr(null)}>
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
