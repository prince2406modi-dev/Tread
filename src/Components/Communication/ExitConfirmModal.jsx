import { useState } from 'react';

function ExitConfirmModal({
  isOpen,
  type = 'logout', // 'logout' | 'exit'
  currentUser,
  lastSyncTime,
  stats,
  onSyncAndProceed,
  onProceedWithoutSync,
  onClose,
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isExit = type === 'exit';
  const actionLabel = isExit ? 'Exit App' : 'Log Out';

  const handleSyncAndProceed = async () => {
    setIsSyncing(true);
    setErrorMessage('');
    try {
      if (onSyncAndProceed) {
        await onSyncAndProceed();
      }
    } catch (err) {
      setErrorMessage(
        'Cloud sync failed: ' + (err.message || 'Network error') + '. You can still choose to ' + actionLabel.toLowerCase() + ' without syncing.'
      );
      setIsSyncing(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1070 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4">{isExit ? '🚪' : '🔒'}</span>
              <div>
                <h5 className="modal-title fw-bold mb-0">
                  {isExit ? 'Exit Tread Application?' : 'Log Out from Tread?'}
                </h5>
                <small className="text-muted" style={{ fontSize: '11.5px' }}>
                  Cloud Synchronization & Backup Check
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={isSyncing}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-3">
              <p className="text-dark fw-semibold mb-2">
                Would you like to sync your latest data to Cloud Firestore before you {actionLabel.toLowerCase()}?
              </p>
              <p className="text-muted small mb-0">
                Syncing guarantees that all your newly created invoices, customers, and stock are safely backed up and available across all your other devices.
              </p>
            </div>

            {/* Summary details */}
            <div className="d-flex justify-content-between flex-wrap gap-2 p-2 bg-white rounded-3 border small text-muted mb-3">
              <div>👤 Account: <strong>{currentUser?.username || 'User'}</strong></div>
              <div>🕒 Last Sync: <strong className="text-primary">{lastSyncTime || 'Never in this session'}</strong></div>
            </div>

            <div className="d-flex justify-content-between flex-wrap gap-2 small text-muted mb-2 px-1">
              <span>📄 Invoices: <strong>{stats?.invoiceCount ?? 0}</strong></span>
              <span>👥 Parties: <strong>{stats?.customerCount ?? 0}</strong></span>
              <span>📦 Stock: <strong>{stats?.stockCount ?? 0}</strong></span>
            </div>

            {/* Syncing spinner */}
            {isSyncing && (
              <div className="alert alert-info d-flex align-items-center gap-2 my-3 shadow-xs">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span className="fw-medium">Syncing data to Cloud Firestore... Please wait.</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="alert alert-danger small my-3 shadow-xs">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="modal-footer bg-white border-top px-4 py-3 d-flex flex-column flex-sm-row justify-content-between gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary px-3 order-3 order-sm-1 w-100 w-sm-auto"
              onClick={onClose}
              disabled={isSyncing}
            >
              Cancel
            </button>

            <div className="d-flex flex-column flex-sm-row gap-2 order-1 order-sm-2 w-100 w-sm-auto">
              <button
                type="button"
                className="btn btn-outline-danger px-3 fw-semibold text-nowrap"
                onClick={onProceedWithoutSync}
                disabled={isSyncing}
              >
                {actionLabel} Without Syncing
              </button>

              <button
                type="button"
                className="btn btn-primary px-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-xs text-nowrap"
                onClick={handleSyncAndProceed}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <span>☁️</span>
                    <span>Sync & {actionLabel}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExitConfirmModal;
