import { useState, useMemo } from 'react';
import { GST_UNITS, DEFAULT_UNIT } from '../../constants/units.js';
import { validateHSN, COMMON_HSN_SAC_CODES } from '../../services/hsnValidator.js';

function AddItem({ onAddItem, onClose, stockItems = [] }) {
  const [item, setItem] = useState({
    name: '',
    hsn: '',
    quantity: 1,
    unit: DEFAULT_UNIT,
    price: '',
    gst: 18,
  });

  const hsnAnalysis = useMemo(() => {
    if (!item.hsn || !item.hsn.trim()) return null;
    return validateHSN(item.hsn);
  }, [item.hsn]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectFromStock = (e) => {
    const stockId = e.target.value;
    if (!stockId) return;
    const selected = stockItems.find((s) => s.id === stockId);
    if (selected) {
      setItem({
        name: selected.name,
        hsn: selected.hsn || '',
        quantity: 1,
        unit: selected.unit || DEFAULT_UNIT,
        price: selected.rate,
        gst: selected.gst || 18,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!item.name.trim()) {
      alert('Please enter an item name or description.');
      return;
    }

    const newItem = {
      name: item.name.trim(),
      hsn: item.hsn?.trim() || '',
      quantity: Math.max(1, Number(item.quantity) || 1),
      unit: item.unit || DEFAULT_UNIT,
      price: Math.max(0, Number(item.price) || 0),
      gst: Number(item.gst) || 0,
      total:
        (Number(item.quantity) || 1) *
        (Number(item.price) || 0) *
        (1 + (Number(item.gst) || 0) / 100),
    };

    if (onAddItem) {
      onAddItem(newItem);
    }

    setItem({
      name: '',
      hsn: '',
      quantity: 1,
      unit: DEFAULT_UNIT,
      price: '',
      gst: 18,
    });

    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1200 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-primary text-white">
            <h2 className="modal-title h5 mb-0">📦 Add Item to Invoice</h2>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {/* Quick Pick From Saved Stock */}
              {stockItems.length > 0 && (
                <div className="mb-3 p-2 bg-light rounded-3 border">
                  <label className="form-label fw-bold small text-primary mb-1">
                    📦 Or Select from Saved Stock Catalog:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    onChange={handleSelectFromStock}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose a product from stock...
                    </option>
                    {stockItems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ₹{s.rate} ({s.stock} {s.unit || 'in stock'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="row g-3 mb-3">
                <div className="col-md-7 col-12">
                  <label className="form-label fw-semibold">
                    Item Name / Description *
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Wireless Mouse, Laptop Adapter..."
                    value={item.name}
                    onChange={handleChange}
                    autoFocus
                    required
                  />
                </div>
                <div className="col-md-5 col-12">
                  <label className="form-label fw-semibold">
                    HSN / SAC Code (optional)
                  </label>
                  <input
                    type="text"
                    name="hsn"
                    className={`form-control font-monospace ${
                      hsnAnalysis
                        ? hsnAnalysis.isValid
                          ? 'is-valid'
                          : 'is-invalid'
                        : ''
                    }`}
                    placeholder="e.g. 8471, 9983"
                    value={item.hsn}
                    onChange={handleChange}
                    maxLength={8}
                    list="hsn-suggestions-list"
                  />
                  <datalist id="hsn-suggestions-list">
                    {COMMON_HSN_SAC_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name} ({c.gst}% GST)
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Real-time HSN Validity Indicator */}
              {hsnAnalysis && (
                <div className="mb-3">
                  {hsnAnalysis.isValid ? (
                    <div className="alert alert-success py-1 px-2 mb-0 small">
                      ✓ <strong>{hsnAnalysis.type} [{hsnAnalysis.length} digits]:</strong> {hsnAnalysis.description}
                    </div>
                  ) : (
                    <div className="alert alert-danger py-1 px-2 mb-0 small">
                      ⚠️ {hsnAnalysis.errorMessage}
                    </div>
                  )}
                </div>
              )}

              <div className="row g-3 mb-3">
                <div className="col-4">
                  <label className="form-label fw-semibold">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-control text-end"
                    min="1"
                    value={item.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-4">
                  <label className="form-label fw-semibold">Unit *</label>
                  <select
                    name="unit"
                    className="form-select"
                    value={item.unit}
                    onChange={handleChange}
                  >
                    {GST_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-4">
                  <label className="form-label fw-semibold">Rate / Price (₹) *</label>
                  <input
                    type="number"
                    name="price"
                    className="form-control text-end"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">GST Rate Slab</label>
                <select
                  name="gst"
                  className="form-select"
                  value={item.gst}
                  onChange={handleChange}
                >
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST (Standard)</option>
                  <option value="28">28% GST (Luxury)</option>
                </select>
              </div>

              {/* Real-time preview calculation */}
              <div className="p-3 bg-light rounded-3 border small">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Item Subtotal:</span>
                  <span>₹{((Number(item.quantity) || 1) * (Number(item.price) || 0)).toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">GST ({item.gst}%):</span>
                  <span className="text-success">
                    ₹{(((Number(item.quantity) || 1) * (Number(item.price) || 0) * Number(item.gst)) / 100).toFixed(2)}
                  </span>
                </div>
                <hr className="my-1" />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Line Total:</span>
                  <span className="text-primary">
                    ₹{(
                      (Number(item.quantity) || 1) *
                      (Number(item.price) || 0) *
                      (1 + Number(item.gst) / 100)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success px-4">
                ＋ Add to Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddItem;