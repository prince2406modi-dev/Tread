import { downloadCompanyProfilePDF } from '../../services/companyPdfGenerator.js';

/**
 * CompanyPreviewModal Component
 * 
 * Renders an on-screen preview of the official company profile & business dossier
 * before generating or downloading the PDF.
 */
export default function CompanyPreviewModal({
  company = {},
  currentUser = {},
  isOpen = false,
  onClose,
}) {
  if (!isOpen) return null;

  const compName = (company?.name || 'Enterprise Business').trim();
  const compAddress = (company?.address || '').trim();
  const compCityState = (company?.cityState || '').trim();
  const compPincode = (company?.pincode || '').trim();
  const compGstin = (company?.gstin || '').trim();
  const compPan = (company?.pan || (compGstin.length >= 12 ? compGstin.slice(2, 12) : '')).trim();
  const compFssai = (company?.fssai || '').trim();
  const compPhone = (company?.phone || '').trim();
  const compEmail = (company?.email || '').trim();
  const compState = (company?.state || '').trim();

  const bankName = (company?.bankName || '').trim();
  const accountNo = (company?.accountNumber || '').trim();
  const ifscCode = (company?.ifsc || '').trim();
  const branchName = (company?.branch || '').trim();
  const termsText = (company?.terms || '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.').trim();

  const fullAddress = [compAddress, compCityState, compPincode ? `PIN: ${compPincode}` : ''].filter(Boolean).join(', ') || 'N/A';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadCompanyProfilePDF(company, currentUser);
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div
            className="modal-header text-white py-3"
            style={{
              background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #1e293b 100%)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5">👁️</span>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-white">Company Profile Dossier Preview</h5>
                <small className="text-white-50" style={{ fontSize: '11px' }}>
                  Official credentials &amp; trade particulars as they appear on the exported document
                </small>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>

          {/* Body Document Sheet */}
          <div className="modal-body p-4 bg-light">
            <div
              className="bg-white p-4 p-md-5 rounded-3 border shadow-sm mx-auto"
              style={{ maxWidth: '780px', minHeight: '600px' }}
            >
              {/* Document Banner */}
              <div
                className="p-3.5 p-md-4 rounded-3 text-white mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3"
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderBottom: '3px solid #f59e0b',
                }}
              >
                <div>
                  <div className="text-warning small fw-bold text-uppercase" style={{ letterSpacing: '0.06em' }}>
                    Official Business Dossier &amp; Corporate Profile
                  </div>
                  <h3 className="h4 fw-bold mb-0 text-white mt-1">{compName.toUpperCase()}</h3>
                  <small className="text-white-50">
                    {compState ? `Authorized Enterprise • ${compState}` : 'Authorized Enterprise & Commercial Entity'}
                  </small>
                </div>

                <div className="badge bg-dark bg-opacity-75 border border-warning text-warning px-3 py-2 text-center rounded-2">
                  <div style={{ fontSize: '9px', letterSpacing: '0.04em' }}>CORPORATE PROFILE</div>
                  <div className="fw-bold" style={{ fontSize: '11px' }}>VERIFIED RECORD</div>
                </div>
              </div>

              {/* Company Logo & Identity */}
              <div className="row align-items-center mb-4 g-3 pb-3 border-bottom">
                <div className="col-auto">
                  {company?.logo ? (
                    <img
                      src={company.logo}
                      alt="Company Logo"
                      className="rounded border p-1 bg-white shadow-xs"
                      style={{ height: '64px', width: '64px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      className="rounded-3 border border-primary p-2 text-center bg-white shadow-xs fw-bold text-primary"
                      style={{
                        width: '64px',
                        height: '64px',
                        fontSize: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {compName ? compName.slice(0, 2).toUpperCase() : 'CO'}
                    </div>
                  )}
                </div>
                <div className="col">
                  <h4 className="h5 fw-bold text-dark mb-1">{compName}</h4>
                  <div className="text-muted small">
                    Primary Office: {fullAddress}
                  </div>
                </div>
              </div>

              {/* Section 1: Legal Credentials */}
              <div className="mb-4">
                <div className="fw-bold text-primary small mb-2 d-flex align-items-center gap-1.5 border-bottom pb-1">
                  <span>🏛️</span>
                  <span>LEGAL, TAX &amp; COMMERCIAL CREDENTIALS</span>
                </div>
                <div className="row g-2 small">
                  <div className="col-sm-6">
                    <div className="p-2 bg-light rounded border-start border-3 border-primary">
                      <span className="text-muted d-block" style={{ fontSize: '11px' }}>GSTIN Number:</span>
                      <strong className="font-monospace text-primary">{compGstin || 'Not Registered / URP'}</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-2 bg-light rounded border-start border-3 border-info">
                      <span className="text-muted d-block" style={{ fontSize: '11px' }}>PAN Number:</span>
                      <strong className="font-monospace">{compPan || 'N/A'}</strong>
                    </div>
                  </div>
                  {compFssai && (
                    <div className="col-sm-6">
                      <div className="p-2 bg-light rounded">
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>FSSAI License:</span>
                        <strong className="font-monospace">{compFssai}</strong>
                      </div>
                    </div>
                  )}
                  <div className="col-sm-6">
                    <div className="p-2 bg-light rounded">
                      <span className="text-muted d-block" style={{ fontSize: '11px' }}>Business State:</span>
                      <strong>{compState || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="mb-4">
                <div className="fw-bold text-primary small mb-2 d-flex align-items-center gap-1.5 border-bottom pb-1">
                  <span>📍</span>
                  <span>REGISTERED OFFICE &amp; CONTACT INFORMATION</span>
                </div>
                <div className="row g-2 small">
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Primary Mobile / Phone:</span>
                    <strong>{compPhone || 'N/A'}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Official Email:</span>
                    <strong className="text-primary">{compEmail || 'N/A'}</strong>
                  </div>
                  <div className="col-12 mt-1">
                    <span className="text-muted d-block">Registered Address:</span>
                    <span>{fullAddress}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Banking Settlement Info */}
              <div className="mb-4 p-3 rounded-3" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                <div className="fw-bold small mb-2 d-flex align-items-center gap-1.5" style={{ color: '#4f46e5' }}>
                  <span>💳</span>
                  <span>BANKING &amp; ELECTRONIC SETTLEMENT CREDENTIALS (NEFT / RTGS / IMPS)</span>
                </div>
                <div className="row g-2 small">
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Bank Name:</span>
                    <strong>{bankName || 'N/A'}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Account Number:</span>
                    <strong className="font-monospace text-dark">{accountNo || 'N/A'}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>IFSC Code:</span>
                    <strong className="font-monospace text-danger">{ifscCode || 'N/A'}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Branch:</span>
                    <span>{branchName || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Terms */}
              <div className="mb-4">
                <div className="fw-bold text-primary small mb-1 border-bottom pb-1">
                  📄 STANDARD COMMERCIAL TERMS &amp; POLICIES
                </div>
                <div className="small text-muted p-2 bg-light rounded" style={{ whiteSpace: 'pre-line' }}>
                  {termsText}
                </div>
              </div>

              {/* Attestation */}
              <div className="pt-3 border-top d-flex justify-content-between align-items-end small text-muted">
                <div>
                  <small className="d-block" style={{ fontSize: '10.5px' }}>
                    Digitally generated via Tread Executive GST Billing Suite
                  </small>
                </div>
                <div className="text-center" style={{ minWidth: '160px' }}>
                  <div className="fw-bold text-dark mb-4">For {compName}</div>
                  <div className="border-top pt-1 text-muted" style={{ fontSize: '10.5px' }}>
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer bg-white d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Close Preview
            </button>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm fw-semibold d-flex align-items-center gap-1.5"
                onClick={handlePrint}
              >
                <span>🖨️</span>
                <span>Print Document</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm fw-bold shadow-xs d-flex align-items-center gap-1.5"
                onClick={handleDownload}
              >
                <span>📥</span>
                <span>Download Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
