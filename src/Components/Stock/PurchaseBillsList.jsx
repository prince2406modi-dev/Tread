import { useState, useMemo, useDeferredValue } from 'react';

function PurchaseBillsList({ purchaseBills = [], onNewBill }) {
  const [selectedBill, setSelectedBill] = useState(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  // Compute Summary Statistics
  const stats = useMemo(() => {
    let totalSpend = 0;
    let totalTax = 0;
    const vendorsSet = new Set();
    let totalItems = 0;

    (purchaseBills || []).forEach((b) => {
      const grand = Number(b.totals?.grandTotal ?? b.totalAmount ?? b.grandTotal ?? 0);
      const tax = Number(b.totals?.totalTax ?? 0);
      totalSpend += grand;
      totalTax += tax;
      const vName = b.vendorName || b.partyName;
      if (vName) vendorsSet.add(vName.trim().toLowerCase());
      totalItems += (b.items || []).length;
    });

    return {
      count: (purchaseBills || []).length,
      totalSpend,
      totalTax,
      uniqueVendors: vendorsSet.size,
      totalItems,
    };
  }, [purchaseBills]);

  const filtered = useMemo(() => {
    return (purchaseBills || []).filter((b) => {
      const q = deferredSearch.toLowerCase().trim();
      if (!q) return true;
      const billNo = (b.billNumber || '').toLowerCase();
      const vendor = (b.vendorName || b.partyName || '').toLowerCase();
      const gstin = (b.vendorGstin || b.partyGstin || '').toLowerCase();
      return billNo.includes(q) || vendor.includes(q) || gstin.includes(q);
    });
  }, [purchaseBills, deferredSearch]);

  const handlePrintModal = () => {
    window.print();
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* ================= EXECUTIVE SUMMARY KPI ROW ================= */}
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Total Inward Bills
              </span>
              <span className="badge bg-primary-subtle text-primary p-2 rounded-circle">📋</span>
            </div>
            <div className="fs-4 fw-bold text-dark">{stats.count}</div>
            <div className="small text-muted mt-1">{stats.totalItems} Line Items Catalogued</div>
            <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '3px', background: 'linear-gradient(90deg, #4f46e5, #3b82f6)' }} />
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Total Inward Spend
              </span>
              <span className="badge bg-success-subtle text-success p-2 rounded-circle">₹</span>
            </div>
            <div className="fs-4 fw-bold text-dark font-monospace">₹{stats.totalSpend.toFixed(2)}</div>
            <div className="small text-muted mt-1">Recorded Inventory Inflow</div>
            <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '3px', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Input GST (ITC)
              </span>
              <span className="badge bg-info-subtle text-info p-2 rounded-circle">⚖️</span>
            </div>
            <div className="fs-4 fw-bold text-primary font-monospace">₹{stats.totalTax.toFixed(2)}</div>
            <div className="small text-success fw-semibold mt-1">✓ Claimable Input Tax Credit</div>
            <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '3px', background: 'linear-gradient(90deg, #06b6d4, #0284c7)' }} />
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Active Suppliers
              </span>
              <span className="badge bg-warning-subtle text-warning p-2 rounded-circle">🏢</span>
            </div>
            <div className="fs-4 fw-bold text-dark">{stats.uniqueVendors}</div>
            <div className="small text-muted mt-1">Registered Trade Creditors</div>
            <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '3px', background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
          </div>
        </div>
      </div>

      {/* ================= MAIN REGISTER CARD ================= */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-header bg-white py-3 px-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 border-bottom">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h2 className="h5 mb-0 fw-bold text-dark">📋 Purchase Bills Register</h2>
              <span className="badge bg-light text-secondary border px-2 py-1 rounded-pill small">
                {filtered.length} {filtered.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <small className="text-muted">
              Supplier tax invoices and inward merchandise vouchers credited to stock inventory.
            </small>
          </div>
          <div className="d-flex gap-2 align-items-center">
            {onNewBill && (
              <button
                type="button"
                className="btn btn-primary btn-sm px-3 py-1.5 fw-bold rounded-3 shadow-xs d-inline-flex align-items-center gap-1.5"
                onClick={onNewBill}
              >
                <span>＋</span>
                <span>Enter Purchase Bill</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-light bg-opacity-50 border-bottom d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div className="position-relative flex-grow-1" style={{ maxWidth: '420px' }}>
            <span
              className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted"
              style={{ pointerEvents: 'none' }}
            >
              🔍
            </span>
            <input
              type="text"
              className="form-control form-control-sm ps-5 rounded-3 bg-white"
              placeholder="Search by bill #, supplier name, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button
              type="button"
              className="btn btn-sm btn-link text-muted text-decoration-none py-0 px-2"
              onClick={() => setSearch('')}
            >
              Clear Filter ✕
            </button>
          )}
        </div>

        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-5 px-3 text-muted">
              <div className="fs-1 mb-2">📋</div>
              <h3 className="h6 fw-bold mb-1 text-dark">
                {search ? 'No purchase records match your search query.' : 'No purchase bills recorded yet.'}
              </h3>
              <p className="text-muted small mb-3">
                {search
                  ? 'Try searching with a different bill number or supplier keyword.'
                  : 'Inward goods into your catalog by typing a supplier bill or importing an Excel sheet.'}
              </p>
              {onNewBill && !search && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-3 rounded-pill fw-semibold"
                  onClick={onNewBill}
                >
                  ＋ Enter First Purchase Bill
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted" style={{ letterSpacing: '0.03em' }}>
                  <tr>
                    <th className="ps-4 py-3" style={{ minWidth: '150px' }}>Bill / Invoice #</th>
                    <th style={{ minWidth: '220px' }}>Supplier / Vendor</th>
                    <th style={{ minWidth: '120px' }}>Bill Date</th>
                    <th className="text-center" style={{ minWidth: '120px' }}>Items Inwarded</th>
                    <th className="text-end" style={{ minWidth: '130px' }}>Taxable Amt (₹)</th>
                    <th className="text-end" style={{ minWidth: '120px' }}>Input Tax (₹)</th>
                    <th className="text-end" style={{ minWidth: '140px' }}>Grand Total (₹)</th>
                    <th className="text-center pe-4" style={{ minWidth: '130px' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {filtered.map((bill) => {
                    const vendor = bill.vendorName || bill.partyName || 'Unknown Vendor';
                    const gstin = bill.vendorGstin || bill.partyGstin || '';
                    const grand = Number(bill.totals?.grandTotal ?? bill.totalAmount ?? bill.grandTotal ?? 0);
                    const tax = Number(bill.totals?.totalTax ?? 0);
                    const subtotal = Number(bill.totals?.subtotal ?? (grand - tax));
                    const itemCount = (bill.items || []).length;

                    return (
                      <tr key={bill.id} className="transition-all">
                        <td className="ps-4">
                          <div className="fw-bold font-monospace text-primary">{bill.billNumber || 'PUR-DRAFT'}</div>
                          {bill.poNumber && (
                            <small className="badge bg-secondary-subtle text-secondary py-0 px-1 border" style={{ fontSize: '10px' }}>
                              PO: {bill.poNumber}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-light text-dark border p-1 rounded-circle" style={{ width: '28px', height: '28px', display: 'grid', placeItems: 'center' }}>
                              🏢
                            </span>
                            <div>
                              <div className="fw-semibold text-dark">{vendor}</div>
                              {gstin ? (
                                <span className="badge bg-light text-muted border font-monospace" style={{ fontSize: '10px' }}>
                                  GSTIN: {gstin}
                                </span>
                              ) : (
                                <span className="small text-muted" style={{ fontSize: '11px' }}>Unregistered Vendor</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-secondary small">
                          {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border rounded-pill px-2 py-1 small">
                            📦 {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                          </span>
                        </td>
                        <td className="text-end font-monospace text-secondary">
                          ₹{subtotal.toFixed(2)}
                        </td>
                        <td className="text-end font-monospace text-success fw-semibold">
                          ₹{tax.toFixed(2)}
                        </td>
                        <td className="text-end font-monospace fw-bold text-dark fs-6">
                          ₹{grand.toFixed(2)}
                        </td>
                        <td className="text-center pe-4">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2.5 rounded-pill fw-semibold shadow-xs d-inline-flex align-items-center gap-1"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <span>👁️</span>
                            <span>View Bill</span>
                          </button>
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

      {/* ================= EXECUTIVE BILL PREVIEW MODAL ================= */}
      {selectedBill && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)', zIndex: 1300 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
              {/* Modal Executive Header */}
              <div
                className="modal-header py-3 px-4 text-white"
                style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary px-2.5 py-1.5 rounded-pill fs-6">🏢</span>
                  <div>
                    <h2 className="modal-title h5 mb-0 fw-bold text-white">
                      Inward Purchase Bill: {selectedBill.billNumber}
                    </h2>
                    <small className="text-white-50">
                      Recorded on {selectedBill.billDate ? new Date(selectedBill.billDate).toLocaleDateString('en-IN') : 'N/A'}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedBill(null)}
                />
              </div>

              <div className="modal-body p-4" id="printable-purchase-bill">
                {/* Supplier & Voucher Info Row */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.04em' }}>
                        Supplier / Creditor
                      </div>
                      <div className="fw-bold fs-6 text-dark mb-1">
                        {selectedBill.vendorName || selectedBill.partyName || 'Unknown Supplier'}
                      </div>
                      {(selectedBill.vendorGstin || selectedBill.partyGstin) && (
                        <div className="small text-secondary mb-1">
                          <span className="text-muted fw-semibold">GSTIN:</span>{' '}
                          <span className="font-monospace fw-bold">{selectedBill.vendorGstin || selectedBill.partyGstin}</span>
                        </div>
                      )}
                      {selectedBill.vendorPhone && (
                        <div className="small text-muted mb-1">📞 {selectedBill.vendorPhone}</div>
                      )}
                      {selectedBill.vendorAddress && (
                        <div className="small text-muted">📍 {selectedBill.vendorAddress}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.04em' }}>
                        Voucher Specifications
                      </div>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-muted">Bill / Reference #:</span>
                        <strong className="font-monospace text-primary">{selectedBill.billNumber}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-muted">Inward Date:</span>
                        <strong>{selectedBill.billDate ? new Date(selectedBill.billDate).toLocaleDateString('en-IN') : 'N/A'}</strong>
                      </div>
                      {selectedBill.poNumber && (
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-muted">Originating PO:</span>
                          <span className="badge bg-secondary-subtle text-secondary border font-monospace">#{selectedBill.poNumber}</span>
                        </div>
                      )}
                      {selectedBill.notes && (
                        <div className="small text-muted mt-2 pt-2 border-top">
                          <em>Note: {selectedBill.notes}</em>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="h6 fw-bold mb-0 text-dark">📦 Inwarded Inventory Items</h3>
                  <span className="badge bg-light text-muted border small">
                    {(selectedBill.items || []).length} Line Items
                  </span>
                </div>

                <div className="table-responsive rounded-3 border mb-4">
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead className="table-light small text-uppercase text-muted">
                      <tr>
                        <th className="ps-3 py-2">#</th>
                        <th>Item Description</th>
                        <th>HSN/SAC</th>
                        <th className="text-end">Qty Inward</th>
                        <th className="text-end">Rate (₹)</th>
                        <th className="text-center">GST %</th>
                        <th className="text-end pe-3">Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBill.items || []).map((it, idx) => {
                        const qty = Number(it.quantity || it.qty || 1);
                        const rate = Number(it.rate || it.purchasePrice || 0);
                        const gstRate = Number(it.gstPercent ?? it.gstRate ?? 0);
                        const lineTotal = Number(it.total ?? (qty * rate * (1 + gstRate / 100)));

                        return (
                          <tr key={idx}>
                            <td className="ps-3 text-muted small">{idx + 1}</td>
                            <td className="fw-semibold text-dark">{it.description || it.name || 'Stock Item'}</td>
                            <td>
                              <span className="badge bg-light text-muted border font-monospace" style={{ fontSize: '10px' }}>
                                {it.hsn || '—'}
                              </span>
                            </td>
                            <td className="text-end fw-bold text-success font-monospace">
                              {qty} <small className="text-muted fw-normal">{it.unit || 'PCS'}</small>
                            </td>
                            <td className="text-end font-monospace text-secondary">
                              ₹{rate.toFixed(2)}
                            </td>
                            <td className="text-center font-monospace">
                              <span className="badge bg-info-subtle text-info border" style={{ fontSize: '10px' }}>
                                {gstRate}%
                              </span>
                            </td>
                            <td className="text-end pe-3 font-monospace fw-bold text-dark">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="row justify-content-end">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      {(() => {
                        const grand = Number(selectedBill.totals?.grandTotal ?? selectedBill.totalAmount ?? selectedBill.grandTotal ?? 0);
                        const tax = Number(selectedBill.totals?.totalTax ?? 0);
                        const subtotal = Number(selectedBill.totals?.subtotal ?? (grand - tax));

                        return (
                          <>
                            <div className="d-flex justify-content-between mb-2 small">
                              <span className="text-muted">Taxable Subtotal:</span>
                              <strong className="font-monospace">₹{subtotal.toFixed(2)}</strong>
                            </div>
                            <div className="d-flex justify-content-between mb-2 small">
                              <span className="text-muted">Input GST Tax Credit (ITC):</span>
                              <strong className="text-success font-monospace">₹{tax.toFixed(2)}</strong>
                            </div>
                            <div className="d-flex justify-content-between fs-5 fw-bold border-top pt-2 mt-1 text-primary">
                              <span>Grand Total:</span>
                              <span className="font-monospace">₹{grand.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3 fw-semibold rounded-pill"
                  onClick={handlePrintModal}
                >
                  🖨️ Print Voucher
                </button>
                <button
                  type="button"
                  className="btn btn-dark btn-sm px-4 fw-semibold rounded-pill"
                  onClick={() => setSelectedBill(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseBillsList;
