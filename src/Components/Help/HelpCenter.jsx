function HelpCenter({ onNavigate, onBack }) {
  const voiceCommands = [
    { command: 'Set customer name to <Name>', example: 'Set customer name to Rajesh Kumar', desc: 'Fills the customer name field' },
    { command: 'Set invoice number to <Number>', example: 'Set invoice number to INV-1002', desc: 'Sets custom invoice number' },
    { command: 'Set phone to <Phone>', example: 'Set phone to 9876543210', desc: 'Fills customer mobile number' },
    { command: 'Set address to <Address>', example: 'Set address to Sector 18, Noida', desc: 'Sets customer address' },
    { command: 'Add item <Item> quantity <Q> rate <R> gst <G>', example: 'Add item Wireless Mouse quantity 2 rate 450 gst 18', desc: 'Automatically adds line item with tax calculation' },
    { command: 'Save invoice', example: 'Save invoice', desc: 'Validates and saves the active bill' },
    { command: 'Clear invoice', example: 'Clear invoice', desc: 'Clears form to start a fresh invoice' },
  ];

  const shortcuts = [
    { keys: 'Alt + N', action: 'Create New Invoice' },
    { keys: 'Alt + D', action: 'Go to Dashboard' },
    { keys: 'Alt + V', action: 'Toggle Voice Assistant' },
    { keys: 'Alt + S', action: 'Save Current Invoice' },
    { keys: 'Esc', action: 'Close Dropdowns and Modals' },
  ];

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Help Center & User Guide</h1>
          <p className="text-muted mb-0">
            Learn how to use Tread GST Billing, voice commands, shortcut keys, and tax configurations.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {onNavigate && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('Create Transaction')}
            >
              ＋ New Invoice
            </button>
          )}
          {onBack && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Voice Billing Guide */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">🎤 Voice Assistant Commands Guide</h2>
            </div>
            <div className="card-body">
              <p className="text-muted small">
                Click <strong>"Start Voice Mode"</strong> on the invoice screen or press <code>Alt + V</code> and speak naturally into your microphone.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Voice Command Template</th>
                      <th>Example</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voiceCommands.map((v, i) => (
                      <tr key={i}>
                        <td><code className="text-primary">{v.command}</code></td>
                        <td><small className="text-dark fw-semibold">"{v.example}"</small></td>
                        <td><small className="text-muted">{v.desc}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts & Quick Start */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">⌨️ Keyboard Shortcuts</h2>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {shortcuts.map((s, i) => (
                  <li key={i} className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                    <span className="small">{s.action}</span>
                    <kbd className="bg-dark text-white px-2 py-1">{s.keys}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">💡 Billing Tips</h2>
            </div>
            <div className="card-body small text-muted">
              <p className="mb-2">
                <strong>1. Automatic GST Calculation:</strong> You can choose from 0%, 5%, 12%, 18%, or 28% GST slabs per item. The tax is calculated instantly.
              </p>
              <p className="mb-2">
                <strong>2. Company Details on PDF:</strong> Ensure your GSTIN and address are configured in <em>Company Details</em> so they appear on customer invoices.
              </p>
              <p className="mb-0">
                <strong>3. Offline & Local Storage:</strong> All your invoices are safely saved in your local browser storage. Use <em>House-Keeping → Data Backup</em> to export them regularly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpCenter;
