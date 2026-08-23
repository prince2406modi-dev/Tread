import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GST_UNITS, DEFAULT_UNIT } from '../../constants/units.js';

const EMPTY_ROW = () => ({
  id: uuidv4(),
  description: '',
  hsn: '',
  quantity: 1,
  rate: 0,
  gstPercent: 18,
  unit: DEFAULT_UNIT,
});

function PurchaseBillEntry({
  vendors = [],
  stockItems = [],
  onSavePurchaseBill,
  onCancel,
}) {
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([EMPTY_ROW(), EMPTY_ROW()]);
  const [notes, setNotes] = useState('');

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    rows.forEach((r) => {
      const q = Math.max(0, Number(r.quantity) || 0);
      const rate = Math.max(0, Number(r.rate) || 0);
      const gst = Number(r.gstPercent) || 0;
      const amt = q * rate;
      subtotal += amt;
      totalTax += (amt * gst) / 100;
    });
    return { subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [rows]);

  const handleSelectVendor = (e) => {
    const vId = e.target.value;
    if (!vId) return;
    const found = vendors.find((v) => v.id === vId);
    if (found) {
      setVendorName(found.name || '');
      setVendorGstin(found.gstin || '');
      setVendorAddress(found.address || '');
    }
  };

  const updateRow = (id, field, val) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: val };
          if (field === 'description') {
            const match = stockItems.find(
              (s) => s.name.trim().toLowerCase() === val.trim().toLowerCase()
            );
            if (match) {
              if (match.hsn) updated.hsn = match.hsn;
              if (match.rate) updated.rate = match.rate;
              if (match.gst !== undefined) updated.gstPercent = match.gst;
              if (match.unit) updated.unit = match.unit;
            }
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert('Please enter Supplier / Vendor name.');
      return;
    }
    if (!billNumber.trim()) {
      alert('Please enter Purchase Bill / Invoice Number.');
      return;
    }
    const valid = rows.filter((r) => r.description.trim().length > 0 && Number(r.quantity) > 0);
    if (valid.length === 0) {
      alert('Please add at least one valid line item with description and quantity.');
      return;
    }

    onSavePurchaseBill({
      billNumber: billNumber.trim(),
      billDate,
      vendorName: vendorName.trim(),
      vendorGstin: vendorGstin.trim(),
      vendorAddress: vendorAddress.trim(),
      items: valid.map((r) => ({
        description: r.description.trim(),
        hsn: r.hsn.trim(),
        quantity: Number(r.quantity) || 1,
        rate: Number(r.rate) || 0,
        gstPercent: Number(r.gstPercent) || 0,
        unit: r.unit || 'PCS',
        amount: (Number(r.quantity) || 1) * (Number(r.rate) || 0),
        tax: ((Number(r.quantity) || 1) * (Number(r.rate) || 0) * (Number(r.gstPercent) || 0)) / 100,
        total: (Number(r.quantity) || 1) * (Number(r.rate) || 0) * (1 + (Number(r.gstPercent) || 0) / 100),
      })),
      totals,
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <h2 className="h5 mb-0 fw-bold">🏢 Supplier & Purchase Bill Details</h2>
            <small className="text-muted">Enter supplier invoice details to inward stock.</small>
          </div>
          {vendors.length > 0 && (
            <select className="form-select form-select-sm" style={{ maxWidth: '240px' }} onChange={handleSelectVendor} defaultValue="">
              <option value="" disabled>👤 Select Saved Supplier...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name} {v.gstin ? `(${v.gstin})` : ''}</option>
              ))}
            </select>
          )}
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Supplier / Vendor Name *</label>
              <input type="text" className="form-control" placeholder="e.g. Apex Hardware Corp" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Supplier GSTIN</label>
              <input type="text" className="form-control" placeholder="09AABCA9876C1Z2" value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value.toUpperCase())} maxLength={15} />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Purchase Bill No. *</label>
              <input type="text" className="form-control" placeholder="e.g. PB-2026-081" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} required />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Bill Date</label>
              <input type="date" className="form-control" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Supplier Address</label>
              <input type="text" className="form-control" placeholder="Supplier office/warehouse address" value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="h5 mb-0 fw-bold">📦 Line Items (Stock Inward)</h2>
            <small className="text-muted">Type each purchased product, quantity, and unit cost.</small>
          </div>
          <button type="button" className="btn btn-outline-primary btn-sm fw-semibold" onClick={() => setRows((p) => [...p, EMPTY_ROW()])}>
            ＋ Add Line Item
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '35%' }}>Item Description</th>
                  <th style={{ width: '12%' }}>HSN Code</th>
                  <th style={{ width: '10%' }} className="text-end">Qty Inward</th>
                  <th style={{ width: '10%' }}>Unit</th>
                  <th style={{ width: '13%' }} className="text-end">Purchase Rate (₹)</th>
                  <th style={{ width: '10%' }} className="text-center">GST %</th>
                  <th style={{ width: '12%' }} className="text-end">Total (₹)</th>
                  <th style={{ width: '6%' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const q = Math.max(0, Number(row.quantity) || 0);
                  const r = Math.max(0, Number(row.rate) || 0);
                  const gst = Number(row.gstPercent) || 0;
                  const total = q * r * (1 + gst / 100);
                  return (
                    <tr key={row.id}>
                      <td>
                        <input type="text" className="form-control form-control-sm" placeholder="Item description..." list="existing-stock-options" value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} autoFocus={idx === rows.length - 1} required />
                      </td>
                      <td>
                        <input type="text" className="form-control form-control-sm" placeholder="HSN" value={row.hsn} onChange={(e) => updateRow(row.id, 'hsn', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="1" className="form-control form-control-sm text-end" value={row.quantity} onChange={(e) => updateRow(row.id, 'quantity', e.target.value)} required />
                      </td>
                      <td>
                        <select className="form-select form-select-sm" value={row.unit || DEFAULT_UNIT} onChange={(e) => updateRow(row.id, 'unit', e.target.value)}>
                          {GST_UNITS.map((u) => (
                            <option key={u.code} value={u.code}>
                              {u.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input type="number" step="0.01" min="0" className="form-control form-control-sm text-end" value={row.rate} onChange={(e) => updateRow(row.id, 'rate', e.target.value)} required />
                      </td>
                      <td>
                        <select className="form-select form-select-sm text-center" value={row.gstPercent} onChange={(e) => updateRow(row.id, 'gstPercent', Number(e.target.value))}>
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="text-end fw-bold text-primary">₹{total.toFixed(2)}</td>
                      <td className="text-center">
                        <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => setRows((p) => p.length > 1 ? p.filter((x) => x.id !== row.id) : [EMPTY_ROW()])}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <datalist id="existing-stock-options">
          {stockItems.map((s) => (
            <option key={s.id} value={s.name}>Current: {s.stock} {s.unit} | Rate: ₹{s.rate}</option>
          ))}
        </datalist>

        <div className="card-footer bg-light py-3">
          <div className="row justify-content-between align-items-center">
            <div className="col-md-6 mb-3 mb-md-0">
              <label className="form-label small fw-semibold">Purchase Notes / Remarks</label>
              <input type="text" className="form-control form-control-sm" placeholder="e.g. Received at warehouse" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="col-md-5 col-lg-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Taxable Subtotal:</span>
                <strong>₹{totals.subtotal.toFixed(2)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Input GST Tax:</span>
                <strong className="text-success">₹{totals.totalTax.toFixed(2)}</strong>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between mb-3">
                <span className="fs-5 fw-bold">Grand Total:</span>
                <span className="fs-5 fw-bold text-primary">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
              <div className="d-flex gap-2">
                {onCancel && (
                  <button type="button" className="btn btn-outline-secondary w-50" onClick={onCancel}>Cancel</button>
                )}
                <button type="submit" className="btn btn-success flex-grow-1 py-2 fw-bold shadow-sm">
                  💾 Save & Inward Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default PurchaseBillEntry;
