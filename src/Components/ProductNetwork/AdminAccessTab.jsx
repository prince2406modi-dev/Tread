import { useState, useMemo } from 'react';

export default function AdminAccessTab({
  catalogs = [],
  accessGrants = [],
  accessRequests = [],
  users = [],
  onGrantAccess,
  onRevokeAccess,
  onApproveRequest,
  onRejectRequest,
  currentUser,
}) {
  const [selectedUserKey, setSelectedUserKey] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState(catalogs[0]?.id || '');
  const [grantFee, setGrantFee] = useState(1499);
  const [validityYears, setValidityYears] = useState(1);
  const [grantNotes, setGrantNotes] = useState('Paid Catalog Access Authorized by Master Admin');
  const [searchGrantQuery, setSearchGrantQuery] = useState('');

  // Available users/companies for the dropdown (exclude admin itself)
  const selectableUsers = useMemo(() => {
    return users.filter((u) => u.username?.toLowerCase() !== 'admin');
  }, [users]);

  // Handle granting access
  const handleGrantSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserKey) {
      alert('Please select a company or user account to grant access to.');
      return;
    }
    if (!selectedCatalogId) {
      alert('Please select a catalog data package.');
      return;
    }

    const targetUser = users.find((u) => u.username === selectedUserKey || u.licenseId === selectedUserKey);
    const targetCat = catalogs.find((c) => c.id === selectedCatalogId);

    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() + Number(validityYears));
    const validUntilStr = validDate.toISOString().slice(0, 10);

    onGrantAccess({
      username: targetUser?.username || selectedUserKey,
      licenseId: targetUser?.licenseId || '',
      companyName: targetUser?.companyName || targetUser?.username || 'Client Enterprise',
      catalogId: targetCat.id,
      catalogName: targetCat.name,
      manufacturerName: targetCat.manufacturerName,
      price: Number(grantFee) || 0,
      validUntil: validUntilStr,
      paymentStatus: 'paid',
      notes: grantNotes.trim(),
    });

    alert(`✓ Paid catalog access for "${targetCat.name}" granted to ${targetUser?.companyName || targetUser?.username}!`);
  };

  // Filtered active grants
  const filteredGrants = useMemo(() => {
    const q = searchGrantQuery.toLowerCase().trim();
    return accessGrants.filter((g) => {
      if (!q) return true;
      return (
        g.companyName?.toLowerCase().includes(q) ||
        g.username?.toLowerCase().includes(q) ||
        g.licenseId?.includes(q) ||
        g.catalogName?.toLowerCase().includes(q) ||
        g.manufacturerName?.toLowerCase().includes(q)
      );
    });
  }, [accessGrants, searchGrantQuery]);

  const pendingRequests = useMemo(() => {
    return accessRequests.filter((r) => r.status === 'pending');
  }, [accessRequests]);

  return (
    <div className="admin-access-tab">
      {/* Top Banner */}
      <div
        className="card border-0 rounded-4 p-4 text-white mb-4 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #312e81 60%, #1e1b4b 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
        }}
      >
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-2 rounded-pill bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30" style={{ fontSize: '11px', fontWeight: 700 }}>
              <span>🛡️ MASTER ADMIN ACCESS CONSOLE</span>
              <span className="badge bg-warning text-dark" style={{ fontSize: '9px' }}>PAID ACCESS GATEKEEPER</span>
            </div>
            <h3 className="h4 fw-bold mb-1 text-white">
              Manufacturer Data Access &amp; Paid License Control
            </h3>
            <p className="text-white-50 small mb-0" style={{ maxWidth: '680px', lineHeight: '1.5' }}>
              All Product Network manufacturer data is strictly paid and protected. Companies and distributors cannot view, search, or import catalog products until you, the <strong>Master Admin</strong>, explicitly grant or approve access for their unique License ID.
            </p>
          </div>

          <div className="text-end">
            <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30 fs-6 px-3 py-2 font-monospace">
              {accessGrants.length} Active Paid Grants
            </span>
          </div>
        </div>
      </div>

      {/* Row: Add Grant Form & Pending Requests */}
      <div className="row g-4 mb-4">
        {/* Panel 1: Grant Access Form */}
        <div className="col-lg-6">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <span className="fs-5">🔑</span>
              <div>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '16px' }}>
                  Grant Paid Access to Company
                </h5>
                <span className="small text-muted">
                  Select a business and unlock a specific manufacturer catalog package.
                </span>
              </div>
            </div>

            <form onSubmit={handleGrantSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Select Company / Customer License *</label>
                <select
                  className="form-select"
                  value={selectedUserKey}
                  onChange={(e) => setSelectedUserKey(e.target.value)}
                  required
                >
                  <option value="">-- Choose Company from Registered Accounts --</option>
                  {selectableUsers.map((u) => (
                    <option key={u.username} value={u.username}>
                      🏢 {u.companyName || u.username} (User: {u.username} • License: {u.licenseId || 'N/A'})
                    </option>
                  ))}
                  {/* Fallback option if user types custom */}
                  <option value="custom_company">＋ Custom Company / External License ID</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Select Master Catalog *</label>
                <select
                  className="form-select"
                  value={selectedCatalogId}
                  onChange={(e) => {
                    setSelectedCatalogId(e.target.value);
                    const cat = catalogs.find((c) => c.id === e.target.value);
                    if (cat?.pricePerYear) setGrantFee(cat.pricePerYear);
                  }}
                  required
                >
                  {catalogs.map((c) => (
                    <option key={c.id} value={c.id}>
                      📦 {c.name} ({c.version}) — ₹{c.pricePerYear || 1499}/yr ({c.manufacturerName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Paid Subscription Fee (₹)</label>
                  <input
                    type="number"
                    className="form-control font-monospace fw-bold"
                    value={grantFee}
                    onChange={(e) => setGrantFee(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Validity Duration</label>
                  <select
                    className="form-select"
                    value={validityYears}
                    onChange={(e) => setValidityYears(e.target.value)}
                  >
                    <option value="1">1 Year Access</option>
                    <option value="2">2 Years Access</option>
                    <option value="3">3 Years Access</option>
                    <option value="10">Lifetime / 10 Years</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Admin Authorization Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paid via Bank Transfer TXN-88492"
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary fw-bold w-100 py-2 shadow-sm">
                ＋ Grant Paid Access &amp; Unlock Catalog
              </button>
            </form>
          </div>
        </div>

        {/* Panel 2: Pending Access Requests */}
        <div className="col-lg-6">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">📩</span>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '16px' }}>
                      Incoming Catalog Activation Requests
                    </h5>
                    <span className="small text-muted">
                      Companies requesting paid access to manufacturer catalogs.
                    </span>
                  </div>
                </div>
                <span className="badge bg-warning text-dark font-monospace">
                  {pendingRequests.length} Pending
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-4 bg-light rounded-3 border">
                  <span className="fs-1 text-muted d-block mb-1">📬</span>
                  <div className="small fw-semibold text-dark">No Pending Activation Requests</div>
                  <span className="small text-muted">
                    When companies tap "Request Paid Activation" in Discover Products, their requests will appear here for your 1-click approval.
                  </span>
                </div>
              ) : (
                <div className="list-group list-group-flush" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="list-group-item px-0 py-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div>
                          <h6 className="fw-bold text-dark mb-0">
                            {req.companyName || req.username}
                          </h6>
                          <div className="small text-muted font-monospace" style={{ fontSize: '11px' }}>
                            License ID: <strong>{req.licenseId || 'N/A'}</strong> &bull; User: {req.username}
                          </div>
                        </div>
                        <span className="badge bg-warning text-dark">Pending Admin Approval</span>
                      </div>

                      <div className="p-2 bg-light rounded-2 my-2 small border">
                        <span className="text-muted">Requested Catalog:</span>{' '}
                        <strong className="text-dark">{req.catalogName}</strong> ({req.manufacturerName})
                        {req.notes && (
                          <div className="text-muted fst-italic mt-1" style={{ fontSize: '11px' }}>
                            "{req.notes}"
                          </div>
                        )}
                      </div>

                      <div className="d-flex justify-content-end gap-2 mt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onRejectRequest(req.id)}
                        >
                          ✕ Decline
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-bold px-3 shadow-xs"
                          onClick={() => {
                            onApproveRequest(req.id, currentUser?.username || 'admin');
                            alert(`✓ Approved! "${req.catalogName}" is now unlocked for ${req.companyName || req.username}.`);
                          }}
                        >
                          ✓ Approve &amp; Activate Paid Access
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-top mt-3 small text-muted">
              💡 <strong>Note:</strong> Approving a request instantly unlocks the catalog and its products in the company's Discover Products and Invoicing sections.
            </div>
          </div>
        </div>
      </div>

      {/* Active Grants Matrix Table */}
      <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden mb-4">
        <div className="p-3 bg-light border-bottom d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              Active Paid Catalog Licenses Matrix ({accessGrants.length})
            </h6>
            <span className="small text-muted">
              All authorized companies and their licensed manufacturer data packages.
            </span>
          </div>

          <div style={{ maxWidth: '300px' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by company, license, catalog..."
              value={searchGrantQuery}
              onChange={(e) => setSearchGrantQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredGrants.length === 0 ? (
          <div className="text-center py-5 text-muted small">
            No active catalog licenses found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light text-muted fw-semibold">
                <tr>
                  <th>Licensed Company</th>
                  <th>Customer License ID</th>
                  <th>Unlocked Catalog</th>
                  <th>Manufacturer</th>
                  <th>Fee Paid</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Authorized By</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrants.map((grant) => (
                  <tr key={grant.id}>
                    <td>
                      <div className="fw-bold text-dark">{grant.companyName || grant.username}</div>
                      <span className="text-muted font-monospace" style={{ fontSize: '10.5px' }}>
                        User: {grant.username}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-dark font-monospace text-warning px-2 py-1">
                        {grant.licenseId || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong className="text-dark">{grant.catalogName}</strong>
                    </td>
                    <td className="text-muted">{grant.manufacturerName}</td>
                    <td className="fw-bold text-success font-monospace">
                      ₹{(grant.amountPaid || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="font-monospace text-dark fw-semibold">
                      {grant.validUntil || 'Active'}
                    </td>
                    <td>
                      <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                        ✓ Active &amp; Paid
                      </span>
                    </td>
                    <td className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                      {grant.grantedBy} &bull; {new Date(grant.grantedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-2"
                        onClick={() => {
                          if (window.confirm(`Revoke catalog access for ${grant.companyName || grant.username}?`)) {
                            onRevokeAccess(grant.id);
                          }
                        }}
                        title="Revoke access"
                      >
                        ✕ Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
