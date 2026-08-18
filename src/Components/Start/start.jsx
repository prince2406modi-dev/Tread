import Logo from '../../assets/Images/Logo.png'

function Start({ onContinue }) {
  return (
    <div className="card shadow-lg border-0 overflow-hidden">
      <div className="row g-0">
        <div className="col-md-6 bg-primary text-white d-flex flex-column justify-content-center p-5">
          <div className="mb-4 text-center">
            <img src={Logo} alt="Company logo" className="app-logo mb-3" />
            <div className="display-4 fw-bold mb-3">Tread</div>
            <h2 className="h3 text-white">GST Invoice & Billing</h2>
          </div>
          <p className="lead text-white-75">
            A polished billing dashboard built for Indian GST invoices, with voice-enabled entry,
            instant tax calculations, and secure user access.
          </p>
          <ul className="list-unstyled mt-4">
            <li className="mb-3">
              <strong>? Voice-driven billing</strong> for faster invoice creation.
            </li>
            <li className="mb-3">
              <strong>? GST-aware totals</strong> with item-level tax handling.
            </li>
            <li className="mb-3">
              <strong>? Secure login</strong> with separate data per user.
            </li>
          </ul>
          <div className="text-center mt-4">
            <button type="button" className="btn btn-light btn-lg" onClick={onContinue}>
              Get Started
            </button>
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center p-5" style={{ background: '#f7f9fc' }}>
          <div>
            <h3 className="mb-4">Start with your first invoice</h3>
            <p className="text-muted">
              Keep your business billing organized with saved invoices and easy customer management.
            </p>
            <div className="border rounded-3 p-3 bg-white shadow-sm">
              <div className="mb-3">
                <strong>Easy access</strong>
                <p className="mb-0 text-muted">Login or create an account to keep your invoices private.</p>
              </div>
              <div>
                <strong>Smart workflow</strong>
                <p className="mb-0 text-muted">Use voice commands to speed up data entry.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Start
