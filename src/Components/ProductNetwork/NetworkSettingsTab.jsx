import { useState } from 'react';

export default function NetworkSettingsTab({
  settings = {},
  onSaveSettings,
  auditLogs = [],
  company,
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings(localSettings);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  return (
    <div className="network-settings-tab">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            Product Network Preferences &amp; Security Controls
          </h4>
          <span className="small text-muted">
            Configure your enterprise network profile, non-destructive import defaults, and data isolation policies.
          </span>
        </div>
      </div>

      {isSavedNotice && (
        <div className="alert alert-success py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2">
          <span>✓</span>
          <span>Product Network preferences updated successfully!</span>
        </div>
      )}

      <div className="row g-4">
        {/* Left: Preferences Form */}
        <div className="col-lg-7">
          <form onSubmit={handleSave}>
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
              <h5 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>
                Enterprise Network Profile
              </h5>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-muted">Business Role on Network</label>
                  <select
                    className="form-select"
                    value={localSettings.businessRole || 'distributor'}
                    onChange={(e) => setLocalSettings({ ...localSettings, businessRole: e.target.value })}
                  >
                    <option value="distributor">Distributor / Wholesaler (Purchases from Brands)</option>
                    <option value="retailer">Retailer / Counter Store</option>
                    <option value="manufacturer">Authorized Brand / Manufacturer (Publishes Catalogs)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-muted">Network Display Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Company name for B2B network"
                    value={localSettings.companyDisplayName || company?.name || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, companyDisplayName: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-0">
                <label className="form-label small fw-semibold text-muted">Default Catalog Sharing Permission</label>
                <select
                  className="form-select"
                  value={localSettings.shareCatalogMode || 'connection_only'}
                  onChange={(e) => setLocalSettings({ ...localSettings, shareCatalogMode: e.target.value })}
                >
                  <option value="connection_only">Connection-Only (Approved partners only)</option>
                  <option value="public">Public (Visible to all verified businesses)</option>
                  <option value="restricted">Restricted (Invitation only)</option>
                </select>
              </div>
            </div>

            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
              <h5 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>
                Non-Destructive Inventory Sync Rules
              </h5>

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="preservePricesSwitch"
                  checked={localSettings.preserveLocalPricesOnUpdate !== false}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, preserveLocalPricesOnUpdate: e.target.checked })
                  }
                />
                <label className="form-check-label small fw-semibold text-dark" htmlFor="preservePricesSwitch">
                  Preserve Local Selling &amp; Purchase Prices on Catalog Updates
                </label>
                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                  When enabled, catalog updates will never overwrite your existing inventory prices, profit margins, or historical purchase rates.
                </div>
              </div>

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notifyUpdateSwitch"
                  checked={localSettings.notifyOnVersionUpdate !== false}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, notifyOnVersionUpdate: e.target.checked })
                  }
                />
                <label className="form-check-label small fw-semibold text-dark" htmlFor="notifyUpdateSwitch">
                  Receive Real-Time Alerts for Manufacturer Catalog Revisions
                </label>
                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                  Generates an alert in <strong>Catalog Updates</strong> when connected brands release price lists.
                </div>
              </div>

              <div className="row g-3 pt-2 border-top">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Default Fallback GST Rate (%)</label>
                  <select
                    className="form-select"
                    value={localSettings.defaultGstRate || 18}
                    onChange={(e) => setLocalSettings({ ...localSettings, defaultGstRate: Number(e.target.value) })}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Default Fallback Unit</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    value={localSettings.defaultUnit || 'PCS'}
                    onChange={(e) => setLocalSettings({ ...localSettings, defaultUnit: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-top text-end">
                <button type="submit" className="btn btn-primary fw-bold px-4 shadow-sm">
                  Save Preferences
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right: Security Isolation & Audit Log */}
        <div className="col-lg-5">
          <div
            className="card border-0 rounded-4 p-4 shadow-sm text-dark mb-4"
            style={{
              background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2 text-warning">
              <span className="fs-5">🛡️</span>
              <h6 className="fw-bold mb-0">Company Data Isolation Policy</h6>
            </div>
            <p className="small text-white text-opacity-80 mb-3" style={{ lineHeight: '1.5' }}>
              TREAD Product Network enforces strict company-level isolation:
            </p>
            <ul className="small text-white text-opacity-75 ps-3 mb-0" style={{ lineHeight: '1.6' }}>
              <li>Your customer invoices and transactions are never transmitted to manufacturers.</li>
              <li>Your warehouse inventory levels remain private.</li>
              <li>Only authorized manufacturers publish catalogs to connected businesses.</li>
              <li>All API and storage operations are encrypted and scoped to your organization.</li>
            </ul>
          </div>

          {/* Audit Logs */}
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
            <h6 className="fw-bold small text-muted text-uppercase mb-3">
              Network Security &amp; Audit Logs
            </h6>

            <div className="list-group list-group-flush small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {auditLogs.length === 0 ? (
                <div className="text-muted small py-2">No security events logged.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="list-group-item px-0 py-2 border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '9.5px' }}>
                        {log.action}
                      </span>
                      <span className="text-muted font-monospace" style={{ fontSize: '10px' }}>
                        {new Date(log.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="fw-semibold text-dark">{log.target}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {log.details}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
