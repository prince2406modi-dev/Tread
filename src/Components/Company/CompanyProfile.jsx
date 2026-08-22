import { useState } from 'react';

const DEFAULT_COMPANY = {
  name: 'Priya Sales',
  gstin: '07AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  email: 'contact@priyasales.com',
  phone: '+91 98765 43210',
  address: 'Sector 53, Vill-Gijhor, Noida',
  cityState: 'Gautambuddha Nagar, Uttar Pradesh',
  pincode: '201301',
  state: 'Uttar Pradesh (09)',
  bankName: 'State Bank of India',
  accountNumber: '123456789012',
  ifsc: 'SBIN0001234',
  terms: '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.\n3. Subject to Noida jurisdiction.',
};

function CompanyProfile({ company, onSaveCompany, onBack }) {
  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_COMPANY,
    ...(company || {}),
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSavedSuccess(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSaveCompany) {
      onSaveCompany(formData);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Company Profile & GST Configuration</h1>
          <p className="text-muted mb-0">
            Configure your enterprise details. These details automatically populate on all PDF invoices and printouts.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          ✓ Company profile saved successfully! PDF templates and invoice headers updated.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
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
                      placeholder="e.g. 07AAAAA0000A1Z5"
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
                      placeholder="e.g. AAAAA0000A"
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

                <div className="mb-3">
                  <label className="form-label fw-semibold">Business State & Code</label>
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
            </div>
          </div>

          {/* Address & Bank Details */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">📍 Address & Bank Details</h2>
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
                    <label className="form-label fw-semibold">City & State</label>
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

                <div className="mb-3">
                  <label className="form-label fw-semibold">Bank Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    className="form-control"
                    value={formData.accountNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Terms & Conditions */}
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">📄 Default Invoice Terms & Conditions</h2>
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
          <button type="submit" className="btn btn-primary btn-lg px-4">
            💾 Save Company Profile
          </button>
        </div>
      </form>
    </div>
  );
}

export default CompanyProfile;
