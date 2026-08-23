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
      {/* Header Banner */}
      <div className="card shadow-sm border-0 mb-4 bg-primary text-white p-4 rounded-3 dashboard-hero-banner">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span className="badge bg-light text-primary px-3 py-1 fw-bold">
                {company?.name ? company.name : 'GST Enterprise Suite'}
              </span>
              <span className="badge bg-success text-white px-2 py-1 small">
                ✓ Active Paid License
              </span>
            </div>
            <h1 className="h3 fw-bold mb-1">
              Welcome back, {currentUser?.username || 'Operator'}!
            </h1>
            <p className="mb-0 text-white-50">
              Overview of your GST invoices, real-time metrics, and quick accounting actions.
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-light fw-semibold shadow-sm"
              onClick={() => onNavigate('Create Transaction')}
            >
              ＋ New Invoice
            </button>
            <button
              type="button"
              className="btn btn-outline-light"
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
          <div className="card shadow-sm border-0 h-100 border-start border-4 border-primary">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold mb-1">
                Total Revenue
              </div>
              <div className="h3 fw-bold text-dark mb-0">
                ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className="text-success fw-semibold">From {stats.totalCount} invoices</small>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 border-start border-4 border-success">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold mb-1">
                Total GST Collected
              </div>
              <div className="h3 fw-bold text-dark mb-0">
                ₹{stats.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className="text-muted">Item tax breakdown ready</small>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 border-start border-4 border-warning">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold mb-1">
                Total Invoices
              </div>
              <div className="h3 fw-bold text-dark mb-0">
                {stats.totalCount}
              </div>
              <small className="text-muted">Saved in local workspace</small>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 border-start border-4 border-info">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold mb-1">
                Unique Customers
              </div>
              <div className="h3 fw-bold text-dark mb-0">
                {stats.uniqueCustomers}
              </div>
              <small className="text-muted">Active client database</small>
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
