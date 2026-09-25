import { useState, useRef } from 'react';
import { downloadCompanyProfilePDF } from '../../services/companyPdfGenerator.js';
import CompanyPreviewModal from './CompanyPreviewModal.jsx';

const DEFAULT_COMPANY = {
  name: '',
  gstin: '',
  pan: '',
  fssai: '',
  email: '',
  phone: '',
  address: '',
  cityState: '',
  pincode: '',
  state: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  logo: '',
  terms: '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.',
};

function CompanyProfile({ company, onSaveCompany, onSave, onBack }) {
  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_COMPANY,
    ...(company || {}),
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [copiedLicense, setCopiedLicense] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sessionUser = (() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.sessionStorage.getItem('gst-invoice-app-current-user') || '{}');
    } catch {
      return {};
    }
  })();
  const userLicenseId = sessionUser.licenseId || '91-00-000-000000';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSavedSuccess(false);
  };

  // Helper to optimize and resize uploaded logo to clean base64 data URL
  const processLogoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400; // max dimension for optimal PDF & Cloud Firestore performance
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png', 0.95);
        setFormData((prev) => ({ ...prev, logo: dataUrl }));
        setSavedSuccess(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveFn = onSaveCompany || onSave;
    if (saveFn) {
      saveFn(formData);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Company Profile &amp; GST Configuration</h1>
          <p className="text-muted mb-0">
            Configure your enterprise details, logo branding, and bank information for all PDF invoices and printouts.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-bold shadow-xs d-flex align-items-center gap-1.5"
            onClick={() => setPreviewOpen(true)}
            title="Preview official company dossier on screen"
          >
            <span>👁️</span>
            <span>Preview Profile</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm fw-bold shadow-xs d-flex align-items-center gap-1.5"
            onClick={() => downloadCompanyProfilePDF(formData, sessionUser)}
            title="Download official company credentials, GST & banking profile as PDF"
          >
            <span>📥</span>
            <span>Download Company PDF</span>
          </button>
          {onBack && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
          ✓ Company profile and logo branding saved successfully! PDF templates and invoice headers updated.
        </div>
      )}

      {/* Executive Customer License Card */}
      <div
        className="card mb-4 border-0 shadow-sm rounded-4 overflow-hidden position-relative"
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #172554 100%)',
          color: '#ffffff',
          border: '1px solid rgba(245,158,11,0.35)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '5%',
            right: '5%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #f59e0b, #fde68a, #f59e0b, transparent)',
          }}
        />
        <div className="card-body p-3.5 p-md-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                className="badge"
                style={{
                  background: 'rgba(245,158,11,0.2)',
                  color: '#fde68a',
                  border: '1px solid rgba(245,158,11,0.4)',
                  fontSize: '10.5px',
                  letterSpacing: '0.05em',
                }}
              >
                OFFICIAL CUSTOMER LICENSE ID
              </span>
              <span className="text-white-50 small">
                • {sessionUser.role === 'Admin' && sessionUser.username === 'admin' ? 'Master Admin' : 'Registered Business'}
              </span>
            </div>
            <div className="h4 fw-bold font-monospace mb-1" style={{ color: '#fde68a', letterSpacing: '0.06em' }}>
              {userLicenseId}
            </div>
            <div className="text-white-50 small">
              This un-guessable 13-digit numeric License ID encodes your country, state, and locality. Quote it to renew your account directly with our company.
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-warning btn-sm fw-bold px-3 py-2 rounded-3"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(userLicenseId);
                  setCopiedLicense(true);
                  setTimeout(() => setCopiedLicense(false), 2000);
                }
              }}
            >
              {copiedLicense ? '✓ Copied to Clipboard!' : '📋 Copy License ID'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hello! I want to renew my Tread Subscription.\nLicense ID: ${userLicenseId}\nUser ID: ${sessionUser.username || ''}\nCompany: ${formData.name || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-sm fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-1.5"
            >
              <span>💬</span> WhatsApp Renewal
            </a>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Section: Company Logo Import & Branding */}
          <div className="col-12">
            <div className="card shadow-sm border-0 border-top border-4 border-primary">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">🖼️</span>
                  <h2 className="h5 mb-0 fw-bold">Company Logo &amp; Brand Emblem</h2>
                </div>
                {formData.logo && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleRemoveLogo}
                  >
                    🗑️ Remove Logo
                  </button>
                )}
              </div>
              <div className="card-body">
                <div className="row align-items-center g-4">
                  {/* Left: Drag-and-drop Import Zone */}
                  <div className="col-md-7">
                    <div
                      className={`p-4 border rounded-3 text-center transition-all ${
                        dragOver ? 'border-primary bg-primary-subtle' : 'border-dashed bg-light'
                      }`}
                      style={{
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                        cursor: 'pointer',
                        borderColor: dragOver ? '#0d6efd' : '#cbd5e1',
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="d-none"
                      />
                      <div className="mb-2 fs-2">📁</div>
                      <h6 className="fw-bold mb-1">
                        Click to Import Logo or Drag &amp; Drop Image Here
                      </h6>
                      <p className="text-muted small mb-2">
                        Supported Formats: PNG, JPG, JPEG, WEBP, SVG (Auto-scaled for crystal-clear PDF output)
                      </p>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary px-3 shadow-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        📤 Choose Logo File
                      </button>
                    </div>
                  </div>

                  {/* Right: Live Invoice Header Preview */}
                  <div className="col-md-5">
                    <div className="p-3 bg-white border rounded shadow-xs text-center">
                      <div className="text-muted small fw-bold text-uppercase mb-2">
                        Header Preview in PDF Invoices
                      </div>
                      <div className="d-flex justify-content-center align-items-center p-3 bg-light rounded" style={{ minHeight: '90px' }}>
                        {formData.logo ? (
                          <div className="d-flex flex-column align-items-center">
                            <img
                              src={formData.logo}
                              alt="Company Logo Preview"
                              className="img-fluid rounded border p-1 bg-white shadow-xs"
                              style={{ maxHeight: '75px', maxWidth: '140px', objectFit: 'contain' }}
                            />
                            <span className="badge bg-success mt-2">✓ Custom Logo Active</span>
                          </div>
                        ) : (
                          <div className="border border-primary rounded p-2 text-center bg-white shadow-xs" style={{ width: '100px' }}>
                            <div className="fw-bolder text-primary" style={{ fontSize: '20px', lineHeight: '1' }}>
                              {formData.name ? formData.name.slice(0, 2).toUpperCase() : 'CO'}
                            </div>
                            <div className="fw-bold text-danger" style={{ fontSize: '7.5px', letterSpacing: '0.5px' }}>
                              {formData.name || 'COMPANY NAME'}
                            </div>
                            <small className="text-muted d-block" style={{ fontSize: '8px' }}>
                              (Default Monogram)
                            </small>
                          </div>
                        )}
                      </div>
                      <small className="text-muted d-block mt-2" style={{ fontSize: '11px' }}>
                        {formData.logo
                          ? 'This custom logo will be automatically rendered on all tax invoices.'
                          : 'No logo imported yet. A smart initials monogram is used by default.'}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">🏢 Business Information</h2>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Company / Trading Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">GSTIN Number</label>
                    <input
                      type="text"
                      name="gstin"
                      className="form-control text-uppercase"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="e.g. 27AAAAA0000A1Z5"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">PAN Number</label>
                    <input
                      type="text"
                      name="pan"
                      className="form-control text-uppercase"
                      value={formData.pan}
                      onChange={handleChange}
                      placeholder="e.g. ARGPM9069G"
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">FSSAI License No.</label>
                    <input
                      type="text"
                      name="fssai"
                      className="form-control"
                      value={formData.fssai || ''}
                      onChange={handleChange}
                      placeholder="e.g. 12724055000459"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Business State &amp; Code</label>
                    <input
                      type="text"
                      name="state"
                      className="form-control"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Uttar Pradesh (09)"
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Contact Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Phone / Mobile</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Address & Bank Details */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">📍 Address &amp; Bank Details</h2>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    className="form-control"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">City &amp; State</label>
                    <input
                      type="text"
                      name="cityState"
                      className="form-control"
                      value={formData.cityState}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">PIN Code</label>
                    <input
                      type="text"
                      name="pincode"
                      className="form-control"
                      value={formData.pincode}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <hr className="my-3" />

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      className="form-control"
                      value={formData.bankName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">IFSC Code</label>
                    <input
                      type="text"
                      name="ifsc"
                      className="form-control text-uppercase"
                      value={formData.ifsc}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-7">
                    <label className="form-label fw-semibold">Bank Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      className="form-control"
                      value={formData.accountNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-semibold">Branch Name</label>
                    <input
                      type="text"
                      name="branch"
                      className="form-control"
                      value={formData.branch || ''}
                      onChange={handleChange}
                      placeholder="e.g. Noida Main Branch"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Terms & Conditions */}
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">📄 Default Invoice Terms &amp; Conditions</h2>
              </div>
              <div className="card-body">
                <textarea
                  name="terms"
                  className="form-control"
                  rows="3"
                  value={formData.terms}
                  onChange={handleChange}
                />
                <small className="text-muted">
                  These terms will be automatically printed at the bottom of exported PDF invoices.
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="submit" className="btn btn-primary btn-lg px-4 shadow-sm fw-bold">
            💾 Save Company Profile &amp; Logo
          </button>
        </div>
      </form>

      {/* Official Company Profile Dossier Preview Modal */}
      <CompanyPreviewModal
        company={formData}
        currentUser={sessionUser}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

export default CompanyProfile;
