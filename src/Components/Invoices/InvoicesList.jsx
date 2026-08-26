import { useState, useMemo, useDeferredValue } from 'react';
import TaxInvoiceModal from './TaxInvoiceModal.jsx';

function InvoicesList({
  invoices = [],
  company,
  onLoadInvoice,
  onDeleteInvoice,
  onClearAllInvoices,
  onDownloadPDF,
  onShareInvoice,
  onNavigate,
  mode = 'list',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'local' | 'central'
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const localCount = useMemo(() => {
    return invoices.filter((inv) => inv.invoiceType === 'local' || (!inv.invoiceType && !inv.isInterState)).length;
  }, [invoices]);

  const centralCount = useMemo(() => {
    return invoices.filter((inv) => inv.invoiceType === 'central' || inv.isInterState === true).length;
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter((inv) => {
      // Filter by invoice type (Local vs Central)
      const isCentral = inv.invoiceType === 'central' || inv.isInterState === true;
      if (typeFilter === 'local' && isCentral) return false;
      if (typeFilter === 'central' && !isCentral) return false;

      if (!deferredSearchTerm) return true;
      const term = deferredSearchTerm.toLowerCase();
      const numMatch = inv.invoiceNumber?.toLowerCase().includes(term);
      const custMatch = inv.customerName?.toLowerCase().includes(term);
      const phoneMatch = inv.customerPhone?.includes(term);
      return numMatch || custMatch || phoneMatch;
    });

    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.invoiceDate || 0) - new Date(b.invoiceDate || 0);
      }
      if (sortBy === 'amount-desc') {
        return (b.totals?.total || 0) - (a.totals?.total || 0);
      }
      if (sortBy === 'amount-asc') {
        return (a.totals?.total || 0) - (b.totals?.total || 0);
      }
      return 0;
    });

    return result;
  }, [invoices, typeFilter, deferredSearchTerm, sortBy]);

  return (
    <div className="py-3">
      {/* Modify Sales Banner */}
      {mode === 'modify' && (
        <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 rounded-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-5">✏️</span>
            <div>
              <strong className="d-block">Modify Sales Invoice Mode</strong>
              <small className="text-muted">Click <strong>&quot;✏️ Edit / Load&quot;</strong> on any invoice below to load and modify its details in the editor.</small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => onNavigate('Add Sales')}
          >
            ＋ Add New Sales Instead
          </button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">
            {mode === 'modify' ? 'Modify Sales Transactions' : 'Sales Register & Invoices'}
          </h1>
          <p className="text-muted mb-0">
            {mode === 'modify'
              ? 'Select any existing sales invoice to update items, quantities, pricing, or customer details.'
              : 'View, search, edit, export, or print your saved GST billing records.'}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-primary shadow-sm"
            onClick={() => onNavigate('Create Transaction')}
          >
            ＋ Create New Invoice
          </button>
          {invoices.length > 0 && onClearAllInvoices && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete ALL saved invoices? This cannot be undone.')) {
                  onClearAllInvoices();
                }
              }}
            >
              Clear All Invoices
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          {/* 1-Click Local vs Central Switcher Tabs */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold small text-muted">Filter By GST Mode:</span>
              <div className="btn-group btn-group-sm shadow-sm" role="group" aria-label="Invoice Type Filter">
                <button
                  type="button"
                  className={`btn fw-bold px-3 ${typeFilter === 'all' ? 'btn-dark' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => setTypeFilter('all')}
                >
                  📋 All Invoices ({invoices.length})
                </button>
                <button
                  type="button"
                  className={`btn fw-bold px-3 ${typeFilter === 'local' ? 'btn-success text-white' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => setTypeFilter('local')}
                >
                  📍 Local Invoices ({localCount})
                </button>
                <button
                  type="button"
                  className={`btn fw-bold px-3 ${typeFilter === 'central' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => setTypeFilter('central')}
                >
                  🌐 Central Invoices ({centralCount})
                </button>
              </div>
            </div>
            <div className="text-muted small">
              Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} records
            </div>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white">🔍</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by invoice #, customer name, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-4">
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date-desc">Sort by: Date (Newest first)</option>
                <option value="date-asc">Sort by: Date (Oldest first)</option>
                <option value="amount-desc">Sort by: Amount (High to Low)</option>
                <option value="amount-asc">Sort by: Amount (Low to High)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-5 text-muted">
              {invoices.length === 0 ? (
                <>
                  <div className="fs-1 mb-2">📄</div>
                  <h2 className="h5">No Invoices Found</h2>
                  <p className="mb-3">You have not created any GST invoices yet.</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onNavigate('Create Transaction')}
                  >
                    Create Your First Invoice
                  </button>
                </>
              ) : (
                <>
                  <div className="fs-2 mb-2">🔍</div>
                  <h2 className="h5">No Matching Results</h2>
                  <p>No invoices matched your filter criteria.</p>
                </>
              )}
            </div>
          ) : (
            <div className="table-responsive" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="table table-hover align-middle mb-0" style={{ minWidth: '740px' }}>
                <thead className="table-light">
                  <tr>
                    <th>Invoice No. & Mode</th>
                    <th>Customer Name</th>
                    <th>Date</th>
                    <th className="text-center">Items</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-end">GST</th>
                    <th className="text-end">Total Amount</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const itemCount = invoice.items?.length || 0;
                    const subtotal = invoice.totals?.subtotal || 0;
                    const gst = invoice.totals?.totalGst || 0;
                    const total = invoice.totals?.total || 0;
                    const isCentral = invoice.invoiceType === 'central' || invoice.isInterState === true;

                    return (
                      <tr key={invoice.id}>
                        <td>
                          <div className="d-flex flex-column align-items-start gap-1">
                            <span className="badge bg-light text-primary border fw-bold fs-6">
                              {invoice.invoiceNumber}
                            </span>
                            {isCentral ? (
                              <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: '10px' }}>
                                🌐 Central (IGST)
                              </span>
                            ) : (
                              <span className="badge bg-success-subtle text-success border" style={{ fontSize: '10px' }}>
                                📍 Local (CGST+SGST)
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold">{invoice.customerName || 'Walk-in Customer'}</div>
                          {invoice.customerPhone && (
                            <small className="text-muted">📞 {invoice.customerPhone}</small>
                          )}
                        </td>
                        <td className="text-muted">{invoice.invoiceDate || 'N/A'}</td>
                        <td className="text-center">
                          <span className="badge bg-secondary rounded-pill">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </td>
                        <td className="text-end text-muted">₹{subtotal.toFixed(2)}</td>
                        <td className="text-end text-muted">₹{gst.toFixed(2)}</td>
                        <td className="text-end fw-bold text-dark fs-6">₹{total.toFixed(2)}</td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-info"
                              title="View & Print Tax Invoice"
                              onClick={() => setSelectedInvoiceForPreview(invoice)}
                            >
                              👁️ View
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              title="Edit in invoice generator"
                              onClick={() => onLoadInvoice(invoice)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              title="Download PDF"
                              onClick={() => onDownloadPDF(invoice)}
                            >
                              📥 PDF
                            </button>
                            {onShareInvoice && (
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                title="Share via Email / SMS"
                                onClick={() => onShareInvoice(invoice)}
                              >
                                ✉️ Share
                              </button>
                            )}
                            {onDeleteInvoice && (
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                title="Delete this invoice"
                                onClick={() => {
                                  if (window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
                                    onDeleteInvoice(invoice.id);
                                  }
                                }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tax Invoice View & Print Modal */}
      {selectedInvoiceForPreview && (
        <TaxInvoiceModal
          invoice={selectedInvoiceForPreview}
          company={company}
          isOpen={!!selectedInvoiceForPreview}
          onClose={() => setSelectedInvoiceForPreview(null)}
        />
      )}
    </div>
  );
}

export default InvoicesList;
