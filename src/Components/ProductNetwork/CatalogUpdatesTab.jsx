import { useState } from 'react';

export default function CatalogUpdatesTab({
  updates = [],
  catalogs = [],
  stockItems = [],
  onAcceptUpdateDiff,
  onRejectUpdateDiff,
  onAcceptAllInUpdate,
  onRejectAllInUpdate,
}) {
  const [selectedUpdateId, setSelectedUpdateId] = useState(updates[0]?.id || null);
  const [activeTab, setActiveTab] = useState('diffs'); // 'diffs' | 'history'

  const activeUpdate = updates.find((u) => u.id === selectedUpdateId) || updates[0] || null;

  return (
    <div className="catalog-updates-tab">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            Catalog Version Updates &amp; Visual Diffs
          </h4>
          <span className="small text-muted">
            Review manufacturer price revisions, GST schedule adjustments, and new releases with granular accept/reject controls.
          </span>
        </div>

        {/* View Toggle */}
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className={`btn ${activeTab === 'diffs' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('diffs')}
          >
            Pending Diffs ({updates.filter((u) => u.status === 'pending').length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            Version History Changelogs
          </button>
        </div>
      </div>

      {/* Non-Destructive Protection Notice */}
      <div
        className="card border-0 rounded-3 p-3 mb-4 shadow-xs"
        style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
          borderLeft: '4px solid #f59e0b',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <span className="fs-4">🔒</span>
          <div className="small text-dark">
            <strong>Immutable Historical Invoices Guarantee:</strong> Accepting a catalog revision updates future item metadata and optional baseline rates, but <em>never</em> retroactively changes previously issued tax invoices, generated GSTR reports, or historical ledger accounting.
          </div>
        </div>
      </div>

      {activeTab === 'diffs' ? (
        updates.length === 0 ? (
          <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
            <span className="fs-1 text-success d-block mb-2">✓</span>
            <h5 className="fw-bold text-dark">All Catalogs Up to Date</h5>
            <p className="small text-muted mb-0">
              No pending catalog revisions from your connected manufacturers.
            </p>
          </div>
        ) : (
          <div className="row g-4">
            {/* Left: Updates List */}
            <div className="col-lg-4">
              <div className="card border-0 rounded-4 shadow-sm bg-white p-3 mb-3">
                <h6 className="fw-bold small text-muted text-uppercase mb-3">
                  Catalog Version Notices
                </h6>
                <div className="list-group list-group-flush">
                  {updates.map((upd) => {
                    const isSelected = upd.id === activeUpdate?.id;
                    const pendingCount = upd.itemsDiff.filter((d) => d.status === 'pending').length;

                    return (
                      <button
                        key={upd.id}
                        type="button"
                        className={`list-group-item list-group-item-action border rounded-3 p-3 mb-2 text-start transition-all ${
                          isSelected ? 'border-primary bg-primary bg-opacity-10 shadow-xs' : 'bg-white'
                        }`}
                        onClick={() => setSelectedUpdateId(upd.id)}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-primary font-monospace" style={{ fontSize: '10px' }}>
                            {upd.previousVersion} &rarr; {upd.newVersion}
                          </span>
                          <span
                            className={`badge ${
                              upd.status === 'accepted'
                                ? 'bg-success'
                                : upd.status === 'rejected'
                                ? 'bg-danger'
                                : 'bg-warning text-dark'
                            }`}
                            style={{ fontSize: '9.5px' }}
                          >
                            {upd.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="fw-bold text-dark text-truncate" style={{ fontSize: '13px' }}>
                          {upd.catalogName}
                        </div>
                        <div className="small text-muted" style={{ fontSize: '11px' }}>
                          🏢 {upd.manufacturerName}
                        </div>
                        <div className="small text-muted mt-1" style={{ fontSize: '10.5px' }}>
                          {pendingCount} product diffs pending review
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Visual Diff Viewer */}
            <div className="col-lg-8">
              {activeUpdate ? (
                <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
                  {/* Update Header */}
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 pb-3 mb-3 border-bottom">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h5 className="fw-bold mb-0 text-dark">{activeUpdate.catalogName}</h5>
                        <span className="badge bg-dark font-monospace text-warning">
                          {activeUpdate.previousVersion} &rarr; {activeUpdate.newVersion}
                        </span>
                      </div>
                      <span className="small text-muted">
                        Published by <strong>{activeUpdate.manufacturerName}</strong> on{' '}
                        {new Date(activeUpdate.publishedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Bulk Accept / Reject */}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => {
                          if (window.confirm('Reject all proposed updates for this catalog?')) {
                            onRejectAllInUpdate(activeUpdate.id);
                          }
                        }}
                      >
                        ✕ Reject All
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-success fw-bold px-3 shadow-xs"
                        onClick={() => {
                          onAcceptAllInUpdate(activeUpdate.id);
                          alert('✓ All product updates accepted and integrated.');
                        }}
                      >
                        ✓ Accept All Updates
                      </button>
                    </div>
                  </div>

                  {/* Change Summary Box */}
                  <div className="p-3 bg-light rounded-3 mb-4 border">
                    <span className="small text-muted fw-semibold d-block mb-1 text-uppercase" style={{ fontSize: '10.5px' }}>
                      Manufacturer Change Summary
                    </span>
                    <div className="small text-dark fw-medium">
                      {activeUpdate.changeSummary}
                    </div>
                  </div>

                  {/* Diffs Table */}
                  <h6 className="fw-bold small text-muted text-uppercase mb-3">
                    Detailed Product Modifications ({activeUpdate.itemsDiff.length})
                  </h6>

                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light text-muted fw-semibold">
                        <tr>
                          <th>Product &amp; SKU</th>
                          <th>Change Type</th>
                          <th>Previous Value</th>
                          <th>Updated Value</th>
                          <th className="text-center">Review</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeUpdate.itemsDiff.map((diff, idx) => {
                          const isPriceChange = diff.changeType === 'price_change';
                          const isNew = diff.changeType === 'new_product';

                          return (
                            <tr key={idx}>
                              <td>
                                <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '200px' }}>
                                  {diff.productName}
                                </div>
                                <span className="text-muted font-monospace" style={{ fontSize: '10.5px' }}>
                                  SKU: {diff.sku || 'N/A'}
                                </span>
                              </td>

                              <td>
                                {isPriceChange ? (
                                  <span className="badge bg-warning bg-opacity-25 text-dark border border-warning">
                                    💰 Price Revision
                                  </span>
                                ) : isNew ? (
                                  <span className="badge bg-success bg-opacity-20 text-success border border-success">
                                    ＋ New Product
                                  </span>
                                ) : (
                                  <span className="badge bg-info bg-opacity-20 text-info border border-info">
                                    ℹ️ Spec / HSN Update
                                  </span>
                                )}
                              </td>

                              <td className="text-muted font-monospace">
                                {diff.oldValue !== null && diff.oldValue !== undefined ? (
                                  typeof diff.oldValue === 'number' ? (
                                    `₹${diff.oldValue.toLocaleString('en-IN')}`
                                  ) : (
                                    String(diff.oldValue)
                                  )
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>

                              <td className="font-monospace fw-bold text-dark">
                                {isNew ? (
                                  <div>
                                    ₹{diff.newValue?.wholesalePrice} Wholesale &bull; {diff.newValue?.gstRate}% GST
                                  </div>
                                ) : typeof diff.newValue === 'number' ? (
                                  <span className="text-primary">
                                    ₹{diff.newValue.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  String(diff.newValue)
                                )}
                              </td>

                              <td className="text-center">
                                <span
                                  className={`badge ${
                                    diff.status === 'accepted'
                                      ? 'bg-success'
                                      : diff.status === 'rejected'
                                      ? 'bg-danger'
                                      : 'bg-warning text-dark'
                                  }`}
                                  style={{ fontSize: '10px' }}
                                >
                                  {diff.status.toUpperCase()}
                                </span>
                              </td>

                              <td className="text-end">
                                {diff.status === 'pending' ? (
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-success py-0 px-2"
                                      onClick={() => onAcceptUpdateDiff(activeUpdate.id, idx)}
                                      title="Accept this change"
                                    >
                                      ✓ Accept
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger py-0 px-2"
                                      onClick={() => onRejectUpdateDiff(activeUpdate.id, idx)}
                                      title="Reject this change"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <span className="small text-muted font-monospace">Processed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )
      ) : (
        /* Version History Changelog Archive */
        <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
          <h5 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>
            Catalog Version Archive &amp; Audit Logs
          </h5>
          <div className="list-group list-group-flush">
            {catalogs.map((cat) => (
              <div key={cat.id} className="list-group-item px-0 py-3 border-bottom">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div>
                    <h6 className="fw-bold text-dark mb-0">{cat.name}</h6>
                    <span className="small text-muted">
                      🏢 {cat.manufacturerName} &bull; Category: {cat.category}
                    </span>
                  </div>
                  <span className="badge bg-primary font-monospace">{cat.version}</span>
                </div>
                <p className="small text-muted mb-1 mt-2">
                  <strong>Changelog:</strong> {cat.changeNotes || 'Initial baseline release.'}
                </p>
                <div className="small text-muted font-monospace" style={{ fontSize: '11px' }}>
                  Effective Date: {cat.effectiveDate} &bull; Status: {cat.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
