import Logo from '../../assets/Images/Logo.png';

function AboutModal({ onClose }) {
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 text-center p-4">
          <div className="mb-3">
            <img src={Logo} alt="Tread Logo" className="app-logo mb-2" style={{ maxHeight: '60px' }} />
            <h2 className="h3 fw-bold text-primary mb-0">Tread</h2>
            <div className="text-muted small text-uppercase letter-spacing-1">
              GST Invoice & ERP Billing Suite
            </div>
          </div>

          <div className="bg-light p-3 rounded-3 mb-3 text-start small">
            <div className="row g-2">
              <div className="col-6"><strong>Version:</strong> 1.0.0</div>
              <div className="col-6"><strong>Framework:</strong> React 19 + Vite</div>
              <div className="col-6"><strong>PDF Engine:</strong> jsPDF + AutoTable</div>
              <div className="col-6"><strong>Voice Engine:</strong> Web Speech API</div>
              <div className="col-6"><strong>Storage:</strong> LocalStorage</div>
              <div className="col-6"><strong>Target:</strong> Web & Desktop</div>
            </div>
          </div>

          <p className="text-muted small mb-4">
            Designed for high-speed Indian GST compliant billing with voice-assisted entry, dynamic tax slabs, custom company branding, and export utilities.
          </p>

          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
