import { useState } from 'react';

function CloudSyncModal({
  isOpen,
  onClose,
  currentUser,
  cloudSyncStatus,
  lastSyncTime,
  onForceSync,
  onPushToCloud,
  onPullFromCloud,
  stats,
}) {
  const [activeAction, setActiveAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleAction = async (actionType, fn) => {
    setActiveAction(actionType);
    setStatusMessage('');
    try {
      await fn();
      setStatusMessage('✓ Operation completed successfully!');
    } catch (err) {
      setStatusMessage('⚠️ ' + (err.message || 'Operation encountered an error.'));
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4">☁️</span>
              <div>
                <h5 className="modal-title fw-bold mb-0">On-Demand Cloud Synchronization</h5>
                <small className="text-muted" style={{ fontSize: '11.5px' }}>
                  Manual click-to-sync controls for multi-device & cloud backup
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={cloudSyncStatus === 'syncing'}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light">
            {/* Status Summary Banner */}
            <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
              <div className="card-body p-3">
                <div className="row g-3 align-items-center">
                  <div className="col-sm-6">
                    <div className="text-muted small">Logged In Account:</div>
                    <div className="fw-bold text-dark fs-6">👤 {currentUser?.username || 'admin'}</div>
                  </div>
                  <div className="col-sm-6 text-sm-end">
                    <div className="text-muted small">Last Synchronized:</div>
                    <div className="fw-semibold text-primary">
                      {lastSyncTime ? `🕒 ${lastSyncTime}` : '⏳ Not Synced in this session'}
                    </div>
                  </div>
                </div>

                <hr className="my-2" />

                {/* Local Stats Breakdown */}
                <div className="d-flex justify-content-between flex-wrap gap-2 pt-1 small text-muted">
                  <span>📄 Invoices: <strong>{stats?.invoiceCount ?? 0}</strong></span>
                  <span>👥 Parties: <strong>{stats?.customerCount ?? 0}</strong></span>
                  <span>📦 Stock Items: <strong>{stats?.stockCount ?? 0}</strong></span>
                  <span>📑 Purchase Bills: <strong>{stats?.purchaseCount ?? 0}</strong></span>
                </div>
              </div>
            </div>

            {/* In-Progress Notification */}
            {cloudSyncStatus === 'syncing' && (
              <div className="alert alert-info d-flex align-items-center gap-2 mb-3 shadow-xs">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span className="fw-medium">Synchronizing with Cloud Firestore... Please wait.</span>
              </div>
            )}

            {/* Status Feedback */}
            {statusMessage && (
              <div
                className={`alert ${
                  statusMessage.startsWith('✓') ? 'alert-success' : 'alert-danger'
                } mb-3 shadow-xs`}
              >
                {statusMessage}
              </div>
            )}

            {/* Manual Sync Options Grid */}
            <div className="row g-3">
              {/* Option 1: 2-Way Merge Sync */}
              <div className="col-12">
                <div className="card border-primary border-2 shadow-sm rounded-3 p-3 bg-white hover-shadow">
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-primary px-2 py-1">RECOMMENDED</span>
                        <h6 className="fw-bold mb-0 text-dark">🚀 Full 2-Way Smart Merge</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Intelligently combines new invoices and customers from both this device and the cloud without overwriting existing data.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary fw-bold px-4 py-2 text-nowrap d-flex align-items-center gap-2 shadow-xs"
                      disabled={cloudSyncStatus === 'syncing'}
                      onClick={() => handleAction('full', onForceSync)}
                    >
                      {activeAction === 'full' ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          <span>Sync 2-Way Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2: Push Local to Cloud */}
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    <h6 className="fw-bold mb-1 text-dark">⬆️ Push / Upload to Cloud</h6>
                    <p className="text-muted small mb-3">
                      Uploads all local invoices, parties, inventory, and company profile from this device to Cloud Firestore.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold w-100 d-flex align-items-center justify-content-center gap-2"
                    disabled={cloudSyncStatus === 'syncing'}
                    onClick={() => handleAction('push', onPushToCloud)}
                  >
                    {activeAction === 'push' ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        <span>Upload to Cloud</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 3: Pull Cloud to Local */}
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    <h6 className="fw-bold mb-1 text-dark">⬇️ Pull / Download from Cloud</h6>
                    <p className="text-muted small mb-3">
                      Downloads the latest cloud database records and updates this device’s local workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary fw-semibold w-100 d-flex align-items-center justify-content-center gap-2"
                    disabled={cloudSyncStatus === 'syncing'}
                    onClick={() => handleAction('pull', onPullFromCloud)}
                  >
                    {activeAction === 'pull' ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <span>📥</span>
                        <span>Download from Cloud</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy & Control Note */}
            <div className="alert alert-light border small text-muted mt-4 mb-0 d-flex align-items-center gap-2">
              <span>🔒</span>
              <span>
                <strong>100% On-Demand Control:</strong> Background auto-sync is paused. Data is only transferred to/from the cloud when you click one of these buttons.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-white border-top px-4 py-3">
            <button
              type="button"
              className="btn btn-secondary px-4 fw-semibold"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CloudSyncModal;
