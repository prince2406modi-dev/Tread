import { useState, useMemo } from 'react';
import AddItemModal from '../AddItem/ItemAddition.jsx';
import TaxInvoiceModal from '../Invoices/TaxInvoiceModal.jsx';
import { GST_UNITS, DEFAULT_UNIT } from '../../constants/units.js';
import { validateGSTIN, GST_STATE_CODES, parseGSTPortalText } from '../../services/gstinValidator.js';
import { validateHSN, COMMON_HSN_SAC_CODES } from '../../services/hsnValidator.js';

function InvoiceEditor({
  customerName,
  setCustomerName,
  invoiceNumber,
  setInvoiceNumber,
  invoiceDate,
  setInvoiceDate,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  invoiceType = 'local',
  setInvoiceType,
  items,
  addItem,
  updateItem,
  removeItem,
  totals,
  resetInvoice,
  saveInvoice,
  recognitionActive,
  setRecognitionActive,
  voiceSupported,
  voiceTranscript,
  downloadPDF,
  onViewAllInvoices,
  customers = [],
  company,
  onSaveCustomer,
  onNavigateToCustomers,
  stockItems = [],
  onNavigateToStock
}) {
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showTaxInvoicePreview, setShowTaxInvoicePreview] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
  });
  const [showNewCustPasteBox, setShowNewCustPasteBox] = useState(false);
  const [newCustPastedText, setNewCustPastedText] = useState('');

  const isCustomerRegistered = customers.some(
    (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
  );

  const newCustGstinAnalysis = useMemo(() => {
    if (!newCustForm.gstin || !newCustForm.gstin.trim()) return null;
    return validateGSTIN(newCustForm.gstin);
  }, [newCustForm.gstin]);

  const handleAutoFillNewCustState = () => {
    if (!newCustForm.gstin || newCustForm.gstin.length < 2) {
      alert('Please enter at least the first 2 digits of the GSTIN (State Code).');
      return;
    }
    const stateCode = newCustForm.gstin.slice(0, 2);
    const stateName = GST_STATE_CODES[stateCode];
    if (stateName) {
      setNewCustForm((f) => ({
        ...f,
        address: `${stateName}, State Code: ${stateCode}, India`,
      }));
    }
  };

  const handleApplyNewCustPastedDetails = () => {
    if (!newCustPastedText.trim()) return;
    const parsed = parseGSTPortalText(newCustPastedText);
    if (parsed.success) {
      setNewCustForm((f) => ({
        ...f,
        name: parsed.businessName || parsed.legalName || f.name,
        gstin: parsed.gstin || f.gstin,
        address: parsed.address || f.address || (parsed.state ? `${parsed.state}, India` : f.address),
      }));
      setNewCustPastedText('');
      setShowNewCustPasteBox(false);
    } else {
      alert('Could not identify address details. Please check pasted text.');
    }
  };

  const handleAddItemFromModal = (newItem) => {
    addItem({
      description: newItem.name,
      hsn: newItem.hsn || '',
      quantity: newItem.quantity,
      unit: newItem.unit || DEFAULT_UNIT,
      rate: newItem.price,
      gstPercent: newItem.gst,
    });
    setShowAddItemModal(false);
  };

  const handleDescriptionChange = (id, newDesc) => {
    updateItem(id, 'description', newDesc);
    // If it matches a saved stock item, auto-fill rate, gst, unit, and hsn
    const matchedStock = stockItems.find(
      (s) => s.name.toLowerCase() === newDesc.trim().toLowerCase()
    );
    if (matchedStock) {
      if (matchedStock.rate !== undefined) updateItem(id, 'rate', matchedStock.rate);
      if (matchedStock.gst !== undefined) updateItem(id, 'gstPercent', matchedStock.gst);
      if (matchedStock.unit) updateItem(id, 'unit', matchedStock.unit);
      if (matchedStock.hsn) updateItem(id, 'hsn', matchedStock.hsn);
    }
  };

  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    if (!custId) return;
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name || '');
      setCustomerPhone(found.phone || '');
      setCustomerAddress(found.address || '');
    }
  };

  const handleSaveCurrentCustomer = () => {
    if (!customerName.trim()) {
      alert('Please enter a customer name first.');
      return;
    }
    if (onSaveCustomer) {
      onSaveCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
      });
    }
  };

  const handleCreateCustomerFromModal = (e) => {
    e.preventDefault();
    if (!newCustForm.name.trim()) {
      alert('Please enter customer name.');
      return;
    }
    if (onSaveCustomer) {
      onSaveCustomer({
        name: newCustForm.name.trim(),
        phone: newCustForm.phone.trim(),
        email: newCustForm.email.trim(),
        address: newCustForm.address.trim(),
        gstin: newCustForm.gstin.trim().toUpperCase(),
      });
    }
    setCustomerName(newCustForm.name.trim());
    setCustomerPhone(newCustForm.phone.trim());
    setCustomerAddress(newCustForm.address.trim());
    setNewCustForm({ name: '', phone: '', email: '', address: '', gstin: '' });
    setShowNewCustomerModal(false);
  };

  const handleQuickSave = () => {
    if (!customerName.trim()) {
      alert('Please select or choose a registered customer.');
      return;
    }
    if (!isCustomerRegistered) {
      alert(
        `❌ Error: Customer "${customerName.trim()}" is not saved in your Customers folder.\n\nYou cannot create an invoice for an unregistered customer. Please select a saved customer or click "+ New Customer" to register them first.`
      );
      return;
    }
    saveInvoice();
  };

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">GST Tax Invoice Generator</h1>
          <p className="text-muted mb-0">
            Create GST compliant bills, add line items with automated tax calculations, or use voice commands.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {onNavigateToStock && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onNavigateToStock}
            >
              📦 Stock Items ({stockItems.length})
            </button>
          )}
          {onNavigateToCustomers && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onNavigateToCustomers}
            >
              👥 Customers ({customers.length})
            </button>
          )}
          {onViewAllInvoices && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onViewAllInvoices}
            >
              📋 View Invoices
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={resetInvoice}
          >
            🔄 New / Clear Form
          </button>
          <button
            type="button"
            className="btn btn-success shadow-sm"
            onClick={handleQuickSave}
          >
            💾 Save Invoice
          </button>
          {items.length > 0 && (
            <button
              type="button"
              className="btn btn-outline-info"
              onClick={() => setShowTaxInvoicePreview(true)}
            >
              👁️ Preview & Print
            </button>
          )}
          {items.length > 0 && downloadPDF && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => {
                downloadPDF({
                  customerName,
                  invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
                  invoiceDate,
                  customerPhone,
                  customerAddress,
                  items,
                  totals,
                });
              }}
            >
              📥 Export PDF
            </button>
          )}
        </div>
      </div>

      {/* 1-Click Local Invoice vs Central Invoice Switcher */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="fw-bold text-dark fs-6">⚡ GST Tax Treatment Mode:</span>
              <span className={`badge px-3 py-2 ${invoiceType === 'central' ? 'bg-primary' : 'bg-success'}`}>
                {invoiceType === 'central' ? '🌐 Central Invoice (Inter-State / IGST)' : '📍 Local Invoice (Intra-State / CGST + SGST)'}
              </span>
            </div>
            <div className="text-muted small">
              {invoiceType === 'central'
                ? '🌐 Inter-State Sale: 100% IGST applied for buyers located outside your home state.'
                : '📍 Intra-State Sale: 50% CGST + 50% SGST applied for buyers located within the same state.'}
            </div>
          </div>
          <div className="btn-group shadow-sm" role="group" aria-label="Invoice Type Switcher">
            <button
              type="button"
              className={`btn fw-bold px-3 py-2 ${
                invoiceType === 'local' ? 'btn-success text-white' : 'btn-outline-secondary bg-white'
              }`}
              onClick={() => setInvoiceType && setInvoiceType('local')}
            >
              📍 Local Invoice (CGST + SGST)
            </button>
            <button
              type="button"
              className={`btn fw-bold px-3 py-2 ${
                invoiceType === 'central' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white'
              }`}
              onClick={() => setInvoiceType && setInvoiceType('central')}
            >
              🌐 Central Invoice (IGST)
            </button>
          </div>
        </div>
      </div>

      {/* Customer Information Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <h2 className="h5 mb-0 fw-bold">👤 Customer & Invoice Information</h2>
            <small className="text-muted">
              Only saved customers from your customer folder can be billed.
            </small>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {customers.length > 0 && (
              <select
                className="form-select form-select-sm"
                style={{ maxWidth: '240px' }}
                onChange={handleSelectCustomer}
                defaultValue=""
              >
                <option value="" disabled>
                  👤 Pick Saved Customer...
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setNewCustForm({
                  name: customerName || '',
                  phone: customerPhone || '',
                  email: '',
                  address: customerAddress || '',
                  gstin: '',
                });
                setShowNewCustomerModal(true);
              }}
              title="Add a new customer to directory"
            >
              ＋ New Customer
            </button>
            {customerName.trim() && !isCustomerRegistered && onSaveCustomer && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={handleSaveCurrentCustomer}
                title="Save this customer for reuse in future invoices"
              >
                💾 Save Customer
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold">Customer Name *</label>
              <input
                type="text"
                className={`form-control ${
                  customerName
                    ? isCustomerRegistered
                      ? 'is-valid'
                      : 'is-invalid'
                    : ''
                }`}
                placeholder="Pick or type saved customer"
                list="saved-customers-list"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              <datalist id="saved-customers-list">
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.phone ? `Phone: ${c.phone}` : ''} {c.address ? `| ${c.address}` : ''}
                  </option>
                ))}
              </datalist>

              {customerName ? (
                isCustomerRegistered ? (
                  <div className="text-success small mt-1 fw-semibold">
                    ✓ Saved in Customer folder
                  </div>
                ) : (
                  <div className="text-danger small mt-1">
                    ⚠️ Not in Customer folder!{' '}
                    <button
                      type="button"
                      className="btn btn-link p-0 text-danger fw-bold text-decoration-underline small"
                      onClick={() => {
                        setNewCustForm({
                          name: customerName,
                          phone: customerPhone,
                          email: '',
                          address: customerAddress,
                          gstin: '',
                        });
                        setShowNewCustomerModal(true);
                      }}
                    >
                      Save Now
                    </button>
                  </div>
                )
              ) : (
                <small className="text-muted">Must be in saved customer folder</small>
              )}
            </div>

            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold">Invoice Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Auto-generated if blank"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold">Invoice Date</label>
              <input
                type="date"
                className="form-control"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold">Phone / Mobile</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="col-12">
              <label className="form-label fw-semibold">Billing Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="Street address, City, State, PIN"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Items Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <h2 className="h5 mb-0 fw-bold">📦 Invoice Line Items</h2>
            <small className="text-muted">Add items via popup dialog, inline table rows, or voice assistant.</small>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                addItem({
                  description: '',
                  hsn: '',
                  quantity: 1,
                  unit: DEFAULT_UNIT,
                  rate: 0,
                  gstPercent: 18,
                });
              }}
              title="Add a blank row directly to the table"
            >
              ＋ Quick Blank Row
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddItemModal(true)}
              title="Open full item addition popup dialog"
            >
              ＋ Add Item (Dialog)
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '28%' }}>Description</th>
                  <th style={{ width: '10%' }}>HSN / SAC</th>
                  <th style={{ width: '8%' }} className="text-end">Qty</th>
                  <th style={{ width: '9%' }}>Unit</th>
                  <th style={{ width: '12%' }} className="text-end">Rate (₹)</th>
                  <th style={{ width: '9%' }} className="text-end">GST %</th>
                  <th style={{ width: '11%' }} className="text-end">
                    {invoiceType === 'central' ? 'IGST Tax (₹)' : 'GST Split (₹)'}
                  </th>
                  <th style={{ width: '10%' }} className="text-end">Total (₹)</th>
                  <th style={{ width: '5%' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const qty = Number(item.quantity || 1);
                  const rate = Number(item.rate || 0);
                  const gstPercent = Number(item.gstPercent || 0);
                  const amount = qty * rate;
                  const gstAmount = (amount * gstPercent) / 100;
                  const lineTotal = amount + gstAmount;

                  const hsnCheck = item.hsn ? validateHSN(item.hsn) : null;

                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={item.description}
                          onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                          placeholder="Item Name / Description"
                          list="stock-items-catalog"
                          autoFocus={!item.description}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={`form-control form-control-sm font-monospace text-center ${
                            hsnCheck ? (hsnCheck.isValid ? 'is-valid' : 'is-invalid') : ''
                          }`}
                          placeholder="e.g. 8471"
                          maxLength={8}
                          value={item.hsn || ''}
                          onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                          list="hsn-datalist-catalog"
                          title={
                            hsnCheck
                              ? hsnCheck.isValid
                                ? `✓ Valid ${hsnCheck.type}: ${hsnCheck.description}`
                                : `⚠️ ${hsnCheck.errorMessage}`
                              : 'Enter 2, 4, 6, or 8-digit HSN/SAC Code'
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm text-end"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={item.unit || DEFAULT_UNIT}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          title="Unit of Measurement (UOM)"
                        >
                          {GST_UNITS.map((u) => (
                            <option key={u.code} value={u.code}>
                              {u.code} ({u.name})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control form-control-sm text-end"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm text-end"
                          value={item.gstPercent}
                          onChange={(e) => updateItem(item.id, 'gstPercent', e.target.value)}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="text-end small">
                        {invoiceType === 'central' ? (
                          <span className="badge bg-primary-subtle text-primary border font-monospace">
                            ₹{gstAmount.toFixed(2)} (IGST)
                          </span>
                        ) : (
                          <span className="badge bg-success-subtle text-success border font-monospace">
                            ₹{(gstAmount / 2).toFixed(2)} C + ₹{(gstAmount / 2).toFixed(2)} S
                          </span>
                        )}
                      </td>
                      <td className="text-end fw-bold">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Remove item"
                          onClick={() => removeItem(item.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="fs-2 mb-2">📦</div>
                      <p className="mb-3 fw-semibold">No items added to this invoice yet.</p>
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setShowAddItemModal(true)}
                        >
                          ＋ Add Item Dialog
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => {
                            addItem({
                              description: '',
                              hsn: '',
                              quantity: 1,
                              unit: DEFAULT_UNIT,
                              rate: 0,
                              gstPercent: 18,
                            });
                          }}
                        >
                          ＋ Quick Blank Row
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary Footer */}
        <div className="card-footer bg-light py-3">
          <div className="row justify-content-end">
            <div className="col-md-6 col-lg-5">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Taxable Subtotal:</span>
                <strong className="text-dark">₹{totals.subtotal.toFixed(2)}</strong>
              </div>

              {invoiceType === 'central' ? (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-primary fw-semibold">🌐 IGST (Integrated Tax 100%):</span>
                  <strong className="text-primary">₹{(totals.igst !== undefined ? totals.igst : totals.totalGst).toFixed(2)}</strong>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between mb-1 small">
                    <span className="text-muted">🏛️ CGST (Central Tax 50%):</span>
                    <strong className="text-dark">₹{(totals.cgst !== undefined ? totals.cgst : totals.totalGst / 2).toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">🏛️ SGST (State Tax 50%):</span>
                    <strong className="text-dark">₹{(totals.sgst !== undefined ? totals.sgst : totals.totalGst / 2).toFixed(2)}</strong>
                  </div>
                </>
              )}

              <div className="d-flex justify-content-between mb-2 pt-2 border-top">
                <span className="text-muted">Total GST Tax:</span>
                <strong className="text-success">₹{totals.totalGst.toFixed(2)}</strong>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between">
                <span className="fs-5 fw-bold">Grand Total:</span>
                <span className="fs-5 fw-bold text-primary">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Assistant Panel */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0 fw-bold">🎤 AI Voice Billing Assistant</h2>
          <button
            type="button"
            className={`btn btn-sm ${recognitionActive ? 'btn-danger' : 'btn-outline-primary'}`}
            onClick={() => setRecognitionActive((prev) => !prev)}
            disabled={!voiceSupported}
          >
            {recognitionActive ? '⏹ Stop Voice Mode' : '🎤 Start Voice Mode'}
          </button>
        </div>
        <div className="card-body">
          {!voiceSupported ? (
            <div className="alert alert-warning mb-0">
              Web Speech recognition is not supported in this browser. Please use Google Chrome or Edge for voice commands.
            </div>
          ) : (
            <div>
              <p className="text-muted small mb-2">
                Speak commands into your microphone, e.g.:
                <em> "Set customer name to Ajay Sharma"</em>,
                <em> "Add item LED Bulb quantity 5 rate 120 gst 18"</em>,
                <em> "Save invoice"</em>.
              </p>
              <div className="p-3 bg-light rounded-3 border small">
                <strong>Live Voice Transcript:</strong>
                <div className="mt-1 text-secondary">
                  {voiceTranscript || 'Listening for speech input... (Press "Start Voice Mode" to begin)'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Datalist for fast stock product auto-completion */}
      <datalist id="stock-items-catalog">
        {stockItems.map((s) => (
          <option key={s.id} value={s.name}>
            Rate: ₹{s.rate} | GST: {s.gst}% | Stock: {s.stock} {s.unit || 'PCS'}
          </option>
        ))}
      </datalist>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <AddItemModal
          stockItems={stockItems}
          onAddItem={handleAddItemFromModal}
          onClose={() => setShowAddItemModal(false)}
        />
      )}

      {/* Register New Customer Quick Modal */}
      {showNewCustomerModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h2 className="modal-title h5 mb-0">👤 Register Customer to Directory</h2>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowNewCustomerModal(false)}
                />
              </div>
              <form onSubmit={handleCreateCustomerFromModal}>
                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 small mb-3">
                    Invoices can only be issued to saved customers. Saving here adds them to your Customer folder and selects them for this invoice.
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Customer / Business Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Kumar"
                      value={newCustForm.name}
                      onChange={(e) =>
                        setNewCustForm((f) => ({ ...f, name: e.target.value }))
                      }
                      autoFocus
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Mobile / Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+91 98765 43210"
                        value={newCustForm.phone}
                        onChange={(e) =>
                          setNewCustForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label fw-semibold mb-0">GSTIN (Optional)</label>
                        {newCustForm.gstin && (
                          <a
                            href={`https://services.gst.gov.in/services/searchtp?gstin=${newCustForm.gstin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="small text-decoration-none"
                          >
                            Verify ↗
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        className={`form-control font-monospace ${
                          newCustGstinAnalysis
                            ? newCustGstinAnalysis.isValid
                              ? 'is-valid'
                              : 'is-invalid'
                            : ''
                        }`}
                        placeholder="07ABCDE1234F1Z5"
                        value={newCustForm.gstin}
                        onChange={(e) =>
                          setNewCustForm((f) => ({
                            ...f,
                            gstin: e.target.value.toUpperCase(),
                          }))
                        }
                        maxLength={15}
                      />
                    </div>
                  </div>

                  {/* Live GSTIN validation badge */}
                  {newCustGstinAnalysis && (
                    <div className="mb-3">
                      {newCustGstinAnalysis.isValid ? (
                        <div className="alert alert-success py-1 px-2 mb-0 small">
                          ✓ <strong>Valid GSTIN:</strong> {newCustGstinAnalysis.stateName} ({newCustGstinAnalysis.entityType})
                        </div>
                      ) : (
                        <div className="alert alert-danger py-1 px-2 mb-0 small">
                          ⚠️ {newCustGstinAnalysis.errorMessage}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                      <label className="form-label fw-semibold mb-0">Billing Address</label>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary py-0 px-2 small"
                          onClick={handleAutoFillNewCustState}
                          title="Auto-fill registered State and Code from GSTIN"
                        >
                          📍 Auto-Fill State
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-primary py-0 px-2 small fw-semibold"
                          onClick={() => setShowNewCustPasteBox((prev) => !prev)}
                          title="Paste full taxpayer address details copied from GST portal"
                        >
                          📋 {showNewCustPasteBox ? 'Hide Paste Box' : 'Paste from GST Portal'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Paste from GST Portal Box */}
                    {showNewCustPasteBox && (
                      <div className="p-3 bg-light border rounded-3 mb-2 small">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong className="text-primary">📋 Paste GST Portal Details / Address:</strong>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Auto-extracts Name, Address & Pincode</span>
                        </div>
                        <textarea
                          className="form-control form-control-sm mb-2 font-monospace"
                          rows={3}
                          placeholder="Copy taxpayer screen or Principal Place of Business address from services.gst.gov.in and paste here..."
                          value={newCustPastedText}
                          onChange={(e) => setNewCustPastedText(e.target.value)}
                        />
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary py-0 px-2"
                            onClick={() => {
                              setNewCustPastedText('');
                              setShowNewCustPasteBox(false);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary py-0 px-3 fw-bold"
                            onClick={handleApplyNewCustPastedDetails}
                          >
                            📥 Extract & Apply Address
                          </button>
                        </div>
                      </div>
                    )}

                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Principal Place of Business / Billing Street, City, State, PIN"
                      value={newCustForm.address}
                      onChange={(e) =>
                        setNewCustForm((f) => ({ ...f, address: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowNewCustomerModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success px-4 fw-bold">
                    💾 Save to Directory & Use
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HSN / SAC Suggestions Catalog Datalist */}
      <datalist id="hsn-datalist-catalog">
        {COMMON_HSN_SAC_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} - {c.name}
          </option>
        ))}
      </datalist>

      {/* Tax Invoice View & Print Modal */}
      {showTaxInvoicePreview && (
        <TaxInvoiceModal
          invoice={{
            customerName,
            invoiceNumber: invoiceNumber || 'INV-DRAFT',
            invoiceDate,
            customerPhone,
            customerAddress,
            items,
            totals,
          }}
          company={company}
          isOpen={showTaxInvoicePreview}
          onClose={() => setShowTaxInvoicePreview(false)}
        />
      )}
    </div>
  );
}

export default InvoiceEditor;
