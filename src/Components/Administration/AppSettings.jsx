import { useState } from 'react';
import {
  getFirebaseConfig,
  saveFirebaseConfig,
  testFirebaseConnection,
} from '../../services/firebase.js';

const DEFAULT_SETTINGS = {
  defaultGst: '18',
  currencySymbol: '₹',
  invoicePrefix: 'INV',
  autoInvoiceNumber: true,
  enableVoice: true,
  dateFormat: 'YYYY-MM-DD',
};

function AppSettings({ settings, onSaveSettings, onBack }) {
  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  }));

  const [fbConfig, setFbConfig] = useState(() => getFirebaseConfig());
  const [testingFirebase, setTestingFirebase] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    setTestResult(null);
    saveFirebaseConfig(fbConfig);
    const res = await testFirebaseConnection();
    setTestResult(res);
    setTestingFirebase(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setSavedSuccess(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveFirebaseConfig(fbConfig);
    if (onSaveSettings) {
      onSaveSettings(formData);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">System & Billing Preferences</h1>
          <p className="text-muted mb-0">
            Configure default GST rates, currency settings, invoice numbering rules, and system behavior.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="alert alert-success">
          ✓ System preferences updated and applied across billing components!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white py-3">
            <h2 className="h5 mb-0 fw-bold">⚙️ General Billing Configuration</h2>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Default GST Slab (%)</label>
                <select
                  name="defaultGst"
                  className="form-select"
                  value={formData.defaultGst}
                  onChange={handleChange}
                >
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST (Standard)</option>
                  <option value="28">28% GST (Luxury)</option>
                </select>
                <small className="text-muted">Pre-fills the GST percentage when adding new items.</small>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Currency Symbol / Prefix</label>
                <input
                  type="text"
                  name="currencySymbol"
                  className="form-control"
                  value={formData.currencySymbol}
                  onChange={handleChange}
                />
                <small className="text-muted">Displayed on reports and invoice tables (e.g. ₹, Rs., INR).</small>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Invoice Number Prefix</label>
                <input
                  type="text"
                  name="invoicePrefix"
                  className="form-control text-uppercase"
                  value={formData.invoicePrefix}
                  onChange={handleChange}
                />
                <small className="text-muted">Used for automatic sequence numbers (e.g. INV-202608-0001).</small>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Date Format</label>
                <select
                  name="dateFormat"
                  className="form-select"
                  value={formData.dateFormat}
                  onChange={handleChange}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (Indian format)</option>
                </select>
              </div>
            </div>

            <hr className="my-3" />

            <div className="form-check form-switch mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="autoInvoiceNumber"
                name="autoInvoiceNumber"
                checked={formData.autoInvoiceNumber}
                onChange={handleChange}
              />
              <label className="form-check-label fw-semibold" htmlFor="autoInvoiceNumber">
                Auto-generate Sequential Invoice Numbers
              </label>
            </div>

            <div className="form-check form-switch">
              <input
                type="checkbox"
                className="form-check-input"
                id="enableVoice"
                name="enableVoice"
                checked={formData.enableVoice}
                onChange={handleChange}
              />
              <label className="form-check-label fw-semibold" htmlFor="enableVoice">
                Enable Voice-Assisted Billing Assistant by Default
              </label>
            </div>
          </div>
        </div>

        {/* Firebase Cloud API Configuration Card */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <div>
              <h2 className="h5 mb-0 fw-bold">🔥 Firebase Cloud API & Database Sync</h2>
              <small className="text-muted">
                Connect your Google Firebase Console project to sync invoices, stock, and customers in the cloud.
              </small>
            </div>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm fw-semibold"
              onClick={handleTestFirebase}
              disabled={testingFirebase || !fbConfig.apiKey || !fbConfig.projectId}
            >
              {testingFirebase ? '⏳ Testing API...' : '🔌 Test Firebase Connection'}
            </button>
          </div>

          <div className="card-body">
            {testResult && (
              <div
                className={`alert ${
                  testResult.success ? 'alert-success' : 'alert-danger'
                } py-2 mb-3 small`}
              >
                {testResult.message}
              </div>
            )}

            <div className="p-3 bg-light rounded-3 border mb-3 small">
              <strong>💡 How to get your API keys from Firebase Console:</strong>
              <ol className="mb-0 mt-1 ps-3 text-secondary">
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="fw-semibold text-primary">console.firebase.google.com</a> and select your project.</li>
                <li>Click <strong>Project Settings ⚙️</strong> &gt; <strong>General</strong> &gt; scroll down to <strong>Your apps</strong>.</li>
                <li>Select <strong>Web app (&lt;/&gt;)</strong> and copy the <code className="text-dark">firebaseConfig</code> credentials.</li>
              </ol>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Firebase API Key (apiKey)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="AIzaSy..."
                  value={fbConfig.apiKey}
                  onChange={(e) => setFbConfig((f) => ({ ...f, apiKey: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Project ID (projectId)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="tread-erp-project"
                  value={fbConfig.projectId}
                  onChange={(e) => setFbConfig((f) => ({ ...f, projectId: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Auth Domain (authDomain)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="tread-erp-project.firebaseapp.com"
                  value={fbConfig.authDomain}
                  onChange={(e) => setFbConfig((f) => ({ ...f, authDomain: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Storage Bucket (storageBucket)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="tread-erp-project.appspot.com"
                  value={fbConfig.storageBucket}
                  onChange={(e) => setFbConfig((f) => ({ ...f, storageBucket: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Messaging Sender ID (messagingSenderId)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="123456789012"
                  value={fbConfig.messagingSenderId}
                  onChange={(e) =>
                    setFbConfig((f) => ({ ...f, messagingSenderId: e.target.value }))
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">App ID (appId)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="1:123456789012:web:abcdef123456"
                  value={fbConfig.appId}
                  onChange={(e) => setFbConfig((f) => ({ ...f, appId: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <button type="submit" className="btn btn-primary btn-lg px-4">
            💾 Save Settings & Firebase API Config
          </button>
        </div>
      </form>
    </div>
  );
}

export default AppSettings;
