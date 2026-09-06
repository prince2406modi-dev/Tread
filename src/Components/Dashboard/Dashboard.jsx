import { useMemo } from 'react';

function Dashboard({
  invoices = [],
  company,
  currentUser,
  onNavigate,
  onLoadInvoice,
  onDownloadPDF,
  onStartVoice
}) {
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalGst = 0;
    const customerSet = new Set();

    invoices.forEach((inv) => {
      if (inv.customerName) {
        customerSet.add(inv.customerName.trim().toLowerCase());
      }
      const invTotal = Number(inv.totals?.total ?? 0);
      const invGst = Number(inv.totals?.totalGst ?? 0);
      totalRevenue += invTotal;
      totalGst += invGst;
    });

    return {
      totalRevenue,
      totalGst,
      totalCount: invoices.length,
      uniqueCustomers: customerSet.size,
    };
  }, [invoices]);

  const recentInvoices = useMemo(() => {
    return [...invoices].slice(0, 5);
  }, [invoices]);

  return (
    <div className="dashboard-container py-3">
      {/* Executive Welcome Hero Banner */}
      <div
        className="dashboard-hero-banner text-white p-4 p-md-5 rounded-4 mb-4 position-relative overflow-hidden shadow-luxury"
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 position-relative">
          <div>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-2 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-20" style={{ fontSize: '12px' }}>
              <span className="badge rounded-pill bg-success" style={{ width: '8px', height: '8px', padding: 0 }} />
              <span className="fw-semibold">
                {company?.name || 'Tread Enterprise'}
              </span>
              <span className="text-white-50">• {currentUser?.subscription?.planName || 'Paid License'}</span>
            </div>
            <h1 className="h3 fw-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
              Welcome back, {currentUser?.username || 'Executive'}
            </h1>
            <p className="mb-0 text-white-50" style={{ fontSize: '14.5px' }}>
              Overview of GST turnover, active tax liabilities, and real-time counter metrics.
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-light fw-semibold shadow-sm px-3"
              onClick={() => onNavigate('Create Transaction')}
            >
              ＋ New Invoice
            </button>
            <button
              type="button"
              className="btn btn-outline-light px-3"
              onClick={onStartVoice}
            >
              🎤 Voice Billing
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 position-relative overflow-hidden" style={{ borderLeft: '4px solid #4f46e5 !important' }}>
            <div className="card-body p-4">
              <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>
                Total Revenue
              </div>
              <div className="h3 fw-bold text-dark mb-1 num-tabular" style={{ letterSpacing: '-0.02em' }}>
                ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className="text-success fw-semibold d-inline-flex align-items-center gap-1">
                <span>↑</span> From {stats.totalCount} completed invoices
              </small>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 position-relative overflow-hidden" style={{ borderLeft: '4px solid #10b981 !important' }}>
            <div className="card-body p-4">
              <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>
                Total GST Collected
              </div>
              <div className="h3 fw-bold text-dark mb-1 num-tabular" style={{ letterSpacing: '-0.02em', color: '#059669' }}>
                ₹{stats.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className="text-muted">Itemized tax breakdown ready</small>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 position-relative overflow-hidden" style={{ borderLeft: '4px solid #f59e0b !important' }}>
            <div className="card-body p-4">
              <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>
                Total Invoices
              </div>
              <div className="h3 fw-bold text-dark mb-1 num-tabular" style={{ letterSpacing: '-0.02em' }}>
                {stats.totalCount}
              </div>
              <small className="text-muted">Saved in cloud &amp; local cache</small>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 position-relative overflow-hidden" style={{ borderLeft: '4px solid #06b6d4 !important' }}>
            <div className="card-body p-4">
              <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>
                Unique Customers
              </div>
              <div className="h3 fw-bold text-dark mb-1 num-tabular" style={{ letterSpacing: '-0.02em' }}>
                {stats.uniqueCustomers}
              </div>
              <small className="text-muted">Active client directory</small>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Shortcut Grid */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0 fw-bold">Recent Invoices</h2>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => onNavigate('View Transactions')}
              >
                View All Invoices
              </button>
            </div>
            <div className="card-body p-0">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p className="mb-2">No invoices recorded yet.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => onNavigate('Create Transaction')}
                  >
                    Create Your First Invoice
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th className="text-end">Amount</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="fw-semibold text-primary">{inv.invoiceNumber}</td>
                          <td>{inv.customerName || 'N/A'}</td>
                          <td className="text-muted">{inv.invoiceDate || 'N/A'}</td>
                          <td className="text-end fw-bold">
                            ₹{(inv.totals?.total ?? 0).toFixed(2)}
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                title="Edit / Load in Editor"
                                onClick={() => onLoadInvoice(inv)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                title="Download PDF"
                                onClick={() => onDownloadPDF(inv)}
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">Quick Operations</h2>
            </div>
            <div className="card-body d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-outline-primary text-start p-3 d-flex align-items-center gap-3"
                onClick={() => onNavigate('Create Transaction')}
              >
                <span className="fs-4">📝</span>
                <div>
                  <div className="fw-bold">Create Invoice</div>
                  <small className="text-muted">Generate new GST tax bill</small>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline-success text-start p-3 d-flex align-items-center gap-3"
                onClick={() => onNavigate('GST File Importer (All Types)')}
              >
                <span className="fs-4">🏛️</span>
                <div>
                  <div className="fw-bold">GST Portal &amp; Returns Hub</div>
                  <small className="text-muted">Import all GST files (GSTR-1, 2B, 3B, JSON/Excel)</small>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary text-start p-3 d-flex align-items-center gap-3"
                onClick={() => onNavigate('Reports')}
              >
                <span className="fs-4">📊</span>
                <div>
                  <div className="fw-bold">GST Tax Reports</div>
                  <small className="text-muted">View slab-wise tax breakdown</small>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary text-start p-3 d-flex align-items-center gap-3"
                onClick={() => onNavigate('Company Details')}
              >
                <span className="fs-4">🏢</span>
                <div>
                  <div className="fw-bold">Company Profile</div>
                  <small className="text-muted">GSTIN, address & bank details</small>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary text-start p-3 d-flex align-items-center gap-3"
                onClick={() => onNavigate('Data Backup')}
              >
                <span className="fs-4">💾</span>
                <div>
                  <div className="fw-bold">Backup Data</div>
                  <small className="text-muted">Export all records to JSON</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
