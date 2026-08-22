import { useState } from 'react';

function PurchaseBillsList({ purchaseBills = [], onNewBill }) {
  const [selectedBill, setSelectedBill] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = (purchaseBills || []).filter((b) => {
    const q = search.toLowerCase();
    return (
      b.billNumber?.toLowerCase().includes(q) ||
      b.vendorName?.toLowerCase().includes(q) ||
      b.vendorGstin?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
        <div>
          <h2 className="h5 mb-0 fw-bold">📋 Inward Purchase Bills Register</h2>
          <small className="text-muted">
            All supplier purchase bills entered to inward items into stock inventory.
          </small>
        </div>
        <div className="d-flex gap-2">
          {onNewBill && (
            <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={onNewBill}>
              ＋ Enter Purchase Bill
            </button>
          )}
        </div>
      </div>

      <div className="p-3 bg-light border-bottom">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="🔍 Search purchase bills by bill number, supplier name, GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card-body p-0">
        {filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="fs-1 mb-2">📋</div>
            <h3 className="h5 fw-bold mb-2">
              {search ? 'No purchase bills match your search.' : 'No purchase bills recorded yet.'}
            </h3>
            <p className="text-muted small mb-3">
              Inward stock by typing a purchase bill or importing an Excel/CSV file.
            </p>
            {onNewBill && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onNewBill}>
                ＋ Enter Purchase Bill
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Bill / Invoice No.</th>
                  <th>Supplier / Vendor</th>
                  <th>Bill Date</th>
                  <th className="text-center">Items Inwarded</th>
                  <th className="text-end">Taxable Value (₹)</th>
                  <th className="text-end">Input GST (₹)</th>
                  <th className="text-end">Grand Total (₹)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <span className="fw-bold text-primary">{bill.billNumber}</span>
                    </td>
                    <td>
                      <div className="fw-semibold">{bill.vendorName}</div>
                      {bill.vendorGstin && <small className="text-muted">GSTIN: {bill.vendorGstin}</small>}
                    </td>
                    <td>{new Date(bill.billDate).toLocaleDateString('en-IN')}</td>
                    <td className="text-center">
                      <span className="badge bg-light text-dark border">
                        {(bill.items || []).length} Item(s)
                      </span>
                    </td>
                    <td className="text-end">₹{(bill.totals?.subtotal || 0).toFixed(2)}</td>
                    <td className="text-end text-success">
                      ₹{(bill.totals?.totalTax || 0).toFixed(2)}
                    </td>
                    <td className="text-end fw-bold text-dark">
                      ₹{(bill.totals?.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0 px-2"
                        onClick={() => setSelectedBill(bill)}
                      >
                        👁️ View Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill View Modal */}
      {selectedBill && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white">
                <h2 className="modal-title h5 mb-0">
                  📄 Purchase Bill: {selectedBill.billNumber}
                </h2>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedBill(null)}
                />
              </div>

              <div className="modal-body p-4">
                <div className="row g-3 mb-4 pb-3 border-bottom">
                  <div className="col-md-6">
                    <span className="text-muted small">Supplier / Vendor:</span>
                    <div className="fw-bold fs-5 text-dark">{selectedBill.vendorName}</div>
                    {selectedBill.vendorGstin && (
                      <div className="small">GSTIN: {selectedBill.vendorGstin}</div>
                    )}
                    {selectedBill.vendorAddress && (
                      <div className="small text-muted">{selectedBill.vendorAddress}</div>
                    )}
                  </div>
                  <div className="col-md-6 text-md-end">
                    <span className="text-muted small">Bill Date:</span>
                    <div className="fw-bold">
                      {new Date(selectedBill.billDate).toLocaleDateString('en-IN')}
                    </div>
                    {selectedBill.notes && (
                      <div className="small text-muted mt-1">Note: {selectedBill.notes}</div>
                    )}
                  </div>
                </div>

                <h3 className="h6 fw-bold mb-2">Inwarded Items:</h3>
                <div className="table-responsive mb-3">
                  <table className="table table-sm table-bordered align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Item Description</th>
                        <th>HSN</th>
                        <th className="text-end">Qty Inward</th>
                        <th className="text-end">Rate (₹)</th>
                        <th className="text-center">GST %</th>
                        <th className="text-end">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBill.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold">{it.description}</td>
                          <td>{it.hsn || '—'}</td>
                          <td className="text-end fw-bold text-success">{it.quantity} {it.unit || ''}</td>
                          <td className="text-end">₹{it.rate}</td>
                          <td className="text-center">{it.gstPercent}%</td>
                          <td className="text-end fw-bold">₹{it.total?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row justify-content-end">
                  <div className="col-md-5">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Subtotal:</span>
                      <strong>₹{(selectedBill.totals?.subtotal || 0).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Input GST Tax:</span>
                      <strong className="text-success">
                        ₹{(selectedBill.totals?.totalTax || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between fs-5 fw-bold border-top pt-2 mt-2">
                      <span>Total Amount:</span>
                      <span className="text-primary">
                        ₹{(selectedBill.totals?.grandTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
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
