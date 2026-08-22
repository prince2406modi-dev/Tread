import { useState, useMemo, useRef } from 'react';
import {
  syncUserDataToCloud,
  fetchUserDataFromCloud,
  isFirebaseConfigured,
} from '../../services/firebase.js';

function Housekeeping({
  invoices = [],
  company,
  users = [],
  currentUser,
  customers = [],
  stockItems = [],
  purchaseBills = [],
  onRestoreData,
  onClearDrafts,
  onBack,
  onNavigateToSettings,
}) {
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const storageStats = useMemo(() => {
    if (typeof window === 'undefined') return { totalKB: 0, itemsCount: 0 };
    let totalBytes = 0;
    let count = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const val = window.localStorage.getItem(key) || '';
        totalBytes += key.length + val.length;
        count++;
      }
    }
    return {
      totalKB: (totalBytes / 1024).toFixed(2),
      itemsCount: count,
      invoiceCount: invoices.length,
      userCount: users.length,
    };
  }, [invoices, users]);

  // Export JSON Backup
  const handleExportBackup = () => {
    try {
      const backupData = {
        app: 'Tread-GST-Invoice',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.username || 'admin',
        company: company || {},
        invoices: invoices || [],
        users: users || [],
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateTag = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tread-backup-${currentUser?.username || 'all'}-${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: `✓ Full backup exported successfully (${invoices.length} invoices, company profile & accounts).`,
      });
    } catch (err) {
      setStatusMessage({ type: 'danger', text: `Failed to export backup: ${err.message}` });
    }
  };

  // Restore JSON Backup
  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const parsed = JSON.parse(content);

        if (!parsed || (!parsed.invoices && !parsed.company)) {
          throw new Error('Invalid backup file format. Missing invoice or company records.');
        }

        if (onRestoreData) {
          onRestoreData(parsed);
        }

        setStatusMessage({
          type: 'success',
          text: `✓ Data restored successfully! Loaded ${parsed.invoices?.length || 0} invoices.`,
        });
      } catch (err) {
        setStatusMessage({
          type: 'danger',
          text: `Restore failed: ${err.message}. Please upload a valid Tread JSON backup.`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Firebase Cloud Backup Handler
  const handleCloudSync = async () => {
    if (!isFirebaseConfigured()) {
      setStatusMessage({
        type: 'warning',
        text: 'Firebase is not configured yet. Please enter your Firebase API credentials in Settings first.',
      });
      return;
    }

    setStatusMessage({ type: 'info', text: '⏳ Uploading data to Firebase Cloud Firestore...' });
    const payload = {
      invoices,
      customers,
      stockItems,
      purchaseBills,
      company,
    };

    const res = await syncUserDataToCloud(currentUser?.username || 'admin', payload);
    setStatusMessage({
      type: res.success ? 'success' : 'danger',
      text: res.message,
    });
  };

  // Firebase Cloud Restore Handler
  const handleCloudRestore = async () => {
    if (!isFirebaseConfigured()) {
      setStatusMessage({
        type: 'warning',
        text: 'Firebase is not configured yet. Please enter your Firebase API credentials in Settings first.',
      });
      return;
    }

    setStatusMessage({ type: 'info', text: '⏳ Fetching backup from Firebase Cloud Firestore...' });
    const res = await fetchUserDataFromCloud(currentUser?.username || 'admin');

    if (res.success && res.data) {
      if (onRestoreData) {
        onRestoreData(res.data);
      }
      setStatusMessage({
        type: 'success',
        text: `✓ Cloud data restored! Loaded ${res.data.invoices?.length || 0} invoices and records.`,
      });
    } else {
      setStatusMessage({
        type: 'danger',
        text: res.message || 'Failed to retrieve cloud backup.',
      });
    }
  };

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">House-Keeping & Database Maintenance</h1>
          <p className="text-muted mb-0">
            Export JSON backups, sync to Firebase Cloud, restore historical data, and monitor database storage.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {statusMessage.text && (
        <div className={`alert alert-${statusMessage.type} alert-dismissible fade show`} role="alert">
          {statusMessage.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setStatusMessage({ type: '', text: '' })}
          />
        </div>
      )}

      {/* Storage Diagnostics */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">Storage Used</div>
            <div className="h3 fw-bold text-primary mb-0">{storageStats.totalKB} KB</div>
            <small className="text-muted">Local browser storage</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">Saved Invoices</div>
            <div className="h3 fw-bold text-success mb-0">{storageStats.invoiceCount}</div>
            <small className="text-muted">Active user records</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">User Accounts</div>
            <div className="h3 fw-bold text-info mb-0">{storageStats.userCount}</div>
            <small className="text-muted">Registered profiles</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">Firebase Status</div>
            <div className={`h3 fw-bold mb-0 ${isFirebaseConfigured() ? 'text-success' : 'text-warning'}`}>
              {isFirebaseConfigured() ? 'Online' : 'Local Only'}
            </div>
            <small className="text-muted">{isFirebaseConfigured() ? 'Cloud API Ready' : 'Configure in Settings'}</small>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="row g-4">
        {/* Firebase Cloud Sync Card */}
        <div className="col-12">
          <div className="card shadow-sm border-0 bg-primary-subtle border-primary">
            <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <h2 className="h5 fw-bold mb-1 text-primary">🔥 Firebase Cloud Sync & Remote Backup</h2>
                <p className="text-muted small mb-0">
                  Backup your entire business database (invoices, customers, stock, purchase bills) to Google Firebase Firestore.
                </p>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {onNavigateToSettings && (
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={onNavigateToSettings}>
                    ⚙️ Firebase Settings
                  </button>
                )}
                <button type="button" className="btn btn-outline-success btn-sm fw-semibold" onClick={handleCloudRestore}>
                  📥 Restore from Cloud
                </button>
                <button type="button" className="btn btn-primary btn-sm fw-bold shadow-sm" onClick={handleCloudSync}>
                  ☁️ Backup to Firebase Cloud
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Local Backup Card */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">💾 Local File Backup</h2>
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-muted">
                  Download a complete backup file containing all your company settings, invoices, customer records, and stock in JSON format.
                </p>
                <div className="p-3 bg-light rounded-3 mb-3 small text-muted">
                  <strong>Included in backup:</strong>
                  <ul className="mb-0 mt-1 ps-3">
                    <li>{invoices.length} Invoices and line items</li>
                    <li>{customers.length} Customers and vendors</li>
                    <li>{stockItems.length} Stock items & inventory</li>
                  </ul>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg w-100"
                onClick={handleExportBackup}
              >
                📥 Export & Download Backup (.JSON)
              </button>
            </div>
          </div>
        </div>

        {/* Local Restore Card */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">🔄 Local File Restore</h2>
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-muted">
                  Restore previously exported invoices and company profiles from a `.json` backup file.
                </p>
                <div className="alert alert-warning small mb-3">
                  ⚠️ Restoring a backup will merge or update current invoices with the backup dataset.
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  className="d-none"
                  onChange={handleRestoreFile}
                />
                <button
                  type="button"
                  className="btn btn-outline-success btn-lg w-100"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📤 Select Backup File to Restore
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance & Cleanup Card */}
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">🧹 System Cleanup & Draft Maintenance</h2>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <h3 className="h6 fw-bold mb-1">Clear Temporary Drafts & Editor Cache</h3>
                  <p className="text-muted small mb-0">
                    Resets unsaved invoice form values without affecting saved historical invoices.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-warning"
                  onClick={() => {
                    if (onClearDrafts) onClearDrafts();
                    setStatusMessage({ type: 'info', text: '✓ Unsaved invoice draft cleared.' });
                  }}
                >
                  Clear Draft Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Housekeeping;
