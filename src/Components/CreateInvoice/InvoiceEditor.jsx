import { useState, useMemo } from 'react';
import AddItemModal from '../AddItem/index.jsx';
import { TaxInvoiceModal } from '../Invoices/index.jsx';
import { GST_UNITS, DEFAULT_UNIT } from '../../constants/units.js';
import { validateGSTIN, GST_STATE_CODES, parseGSTPortalText } from '../../services/gstinValidator.js';

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

  const [showExcelPasteModal, setShowExcelPasteModal] = useState(false);
  const [excelPastedText, setExcelPastedText] = useState('');

  const matchedCustomer = useMemo(() => {
    if (!customerName || !customerName.trim()) return null;
    return customers.find(
      (c) => c.name && c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
  }, [customerName, customers]);

  const applyCustomer = (cust) => {
    if (!cust) return;
    setCustomerName(cust.name || '');
    if (cust.phone) setCustomerPhone(cust.phone);
    if (cust.address) setCustomerAddress(cust.address);
    // Auto-select Local vs Central invoice according to buyer state
    if (setInvoiceType) {
      if (cust.gstin && cust.gstin.length >= 2 && company?.gstin && company.gstin.length >= 2) {
        const custState = cust.gstin.slice(0, 2);
        const compState = company.gstin.slice(0, 2);
        setInvoiceType(custState === compState ? 'local' : 'central');
      } else if (cust.address && company?.state) {
        const compStateLower = company.state.toLowerCase().trim();
        const custAddrLower = cust.address.toLowerCase().trim();
        setInvoiceType(custAddrLower.includes(compStateLower) ? 'local' : 'central');
      }
    }
  };

  const handleCustomerNameChange = (newName) => {
    setCustomerName(newName);
    if (!newName) return;
    const found = customers.find(
      (c) => c.name && c.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    if (found) {
      applyCustomer(found);
    }
  };

  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    if (!custId) return;
    const found = customers.find((c) => c.id === custId);
    if (found) {
      applyCustomer(found);
    }
  };

  const parseAndAddExcelRows = (text) => {
    if (!text || !text.trim()) return 0;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0;

    for (const line of lines) {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      if (cols.length === 0) continue;

      const desc = (cols[0] || '').trim();
      if (/description|item|particulars|name/i.test(desc) && added === 0) continue;

      let hsn = '';
      let qty = 1;
      let unit = DEFAULT_UNIT;
      let rate = 0;
      let gst = 18;

      if (cols.length === 1) {
        // Just description
      } else if (cols.length === 2) {
        rate = parseFloat(cols[1].replace(/[^0-9.]/g, '')) || 0;
      } else if (cols.length === 3) {
        qty = parseFloat(cols[1].replace(/[^0-9.]/g, '')) || 1;
        rate = parseFloat(cols[2].replace(/[^0-9.]/g, '')) || 0;
      } else if (cols.length >= 4) {
        const col1 = cols[1].trim();
        const isCol1Hsn = /^\d{2,8}$/.test(col1);
        if (isCol1Hsn) {
          hsn = col1;
          qty = parseFloat(cols[2]?.replace(/[^0-9.]/g, '')) || 1;
          if (cols.length >= 6) {
            unit = cols[3]?.trim() || DEFAULT_UNIT;
            rate = parseFloat(cols[4]?.replace(/[^0-9.]/g, '')) || 0;
            gst = parseFloat(cols[5]?.replace(/[^0-9.]/g, '')) || 18;
          } else {
            rate = parseFloat(cols[3]?.replace(/[^0-9.]/g, '')) || 0;
            gst = parseFloat(cols[4]?.replace(/[^0-9.]/g, '')) || 18;
          }
        } else {
          qty = parseFloat(cols[1]?.replace(/[^0-9.]/g, '')) || 1;
          rate = parseFloat(cols[2]?.replace(/[^0-9.]/g, '')) || 0;
          gst = parseFloat(cols[3]?.replace(/[^0-9.]/g, '')) || 18;
        }
      }

      addItem({
        description: desc || `Item ${items.length + added + 1}`,
        hsn,
        quantity: Math.max(1, qty),
        unit,
        rate: Math.max(0, rate),
        gstPercent: [0, 5, 12, 18, 28].includes(gst) ? gst : 18,
      });
      added++;
    }
    return added;
  };

  const handleTableGridPaste = (e) => {
    const pasteData = e.clipboardData?.getData('text');
    if (pasteData && (pasteData.includes('\t') || pasteData.includes('\n'))) {
      e.preventDefault();
      const count = parseAndAddExcelRows(pasteData);
      if (count > 0) {
        alert(`✓ Successfully pasted ${count} rows directly from Excel!`);
      }
    }
  };

  const handleCellKeyDown = (e, rowIndex) => {
    if (e.key === 'Enter') {
      if (rowIndex === items.length - 1 || e.ctrlKey) {
        e.preventDefault();
        addItem({
          description: '',
          hsn: '',
          quantity: 1,
          unit: DEFAULT_UNIT,
          rate: 0,
          gstPercent: 18,
        });
      }
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
                onChange={(e) => handleCustomerNameChange(e.target.value)}
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

            {/* Linked Party Master Summary Banner */}
            {matchedCustomer && (
              <div className="col-12">
                <div className="p-2 px-3 rounded-2 border bg-light-subtle d-flex align-items-center justify-content-between flex-wrap gap-2 animate-fade-in">
                  <div className="d-flex align-items-center gap-2 flex-wrap small">
                    <span className="badge bg-success text-white fw-bold">
                      ✓ Master Record Linked
                    </span>
                    {matchedCustomer.groupName && (
                      <span className="badge bg-secondary-subtle text-secondary border">
                        📁 {matchedCustomer.groupName}
                      </span>
                    )}
                    {matchedCustomer.gstin && (
                      <span className="badge bg-primary-subtle text-primary border font-monospace">
                        🏛️ GSTIN: {matchedCustomer.gstin}
                      </span>
                    )}
                    {matchedCustomer.phone && (
                      <span className="text-secondary fw-semibold">📞 {matchedCustomer.phone}</span>
                    )}
                    {matchedCustomer.address && (
                      <span className="text-muted text-truncate" style={{ maxWidth: '350px' }} title={matchedCustomer.address}>
                        📍 {matchedCustomer.address}
                      </span>
                    )}
                    {matchedCustomer.openingBalance && (
                      <span className="badge bg-warning-subtle text-dark border border-warning fw-bold">
                        💰 Bal: {matchedCustomer.openingBalance}
                      </span>
                    )}
                  </div>
                  <div className="text-muted small">
                    Autofilled from Chart of Accounts
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Excel Spreadsheet Line Items Card */}
      <div className="excel-spreadsheet-card mb-4">
        {/* Excel Green Ribbon Header Bar */}
        <div className="excel-ribbon-bar">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-5">📊</span>
            <div>
              <span className="fw-bold fs-6">Sheet 1 — Invoice Line Items</span>
              <span className="badge bg-white text-dark ms-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                Excel Grid Mode
              </span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="excel-ribbon-btn"
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
              title="Insert a blank row (Enter)"
            >
              <span>＋</span> Insert Row
            </button>
            <button
              type="button"
              className="excel-ribbon-btn"
              onClick={() => setShowExcelPasteModal(true)}
              title="Paste range from Excel / Google Sheets"
            >
              <span>📋</span> Paste from Excel
            </button>
            <button
              type="button"
              className="excel-ribbon-btn"
              onClick={() => setShowAddItemModal(true)}
              title="Add item from catalog / inventory dialog"
            >
              <span>📦</span> Stock Catalog
            </button>
            {items.length > 0 && (
              <button
                type="button"
                className="excel-ribbon-btn bg-danger-subtle text-danger border-0"
                onClick={() => removeItem(items[items.length - 1].id)}
                title="Delete the last row"
              >
                <span>🗑️</span> Delete Row
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                className="excel-ribbon-btn"
                onClick={() => {
                  if (window.confirm('Clear all line items from this invoice sheet?')) {
                    items.forEach((it) => removeItem(it.id));
                  }
                }}
                title="Clear all rows"
              >
                <span>⚡</span> Clear Grid
              </button>
            )}
          </div>
        </div>

        {/* Excel Formula Bar */}
        <div className="excel-formula-bar">
          <span className="excel-fx-icon">fx</span>
          <span className="badge bg-white text-secondary border font-monospace me-1 px-2 py-1">
            H{items.length || 1}
          </span>
          <div className="excel-formula-content d-flex align-items-center justify-content-between gap-3 w-100">
            <span className="text-muted">
              =SUM(H1:H{items.length || 1}) &nbsp;|&nbsp; Formula: (Qty × Rate) + GST &nbsp;|&nbsp; {items.length} {items.length === 1 ? 'Row' : 'Rows'}
            </span>
            <div className="d-flex align-items-center gap-3 font-monospace small">
              <span className="text-secondary">Subtotal: <strong>₹{totals.subtotal.toFixed(2)}</strong></span>
              <span className="text-primary">Tax: <strong>₹{totals.totalGst.toFixed(2)}</strong></span>
              <span className="text-success fw-bold">Total: <strong>₹{totals.total.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* Excel Spreadsheet Table */}
        <div
          className="table-responsive"
          style={{ WebkitOverflowScrolling: 'touch', minHeight: '180px' }}
          onPaste={handleTableGridPaste}
        >
          <table className="excel-grid-table" style={{ minWidth: '820px' }}>
            <thead>
              <tr>
                <th className="excel-col-head excel-row-num" style={{ width: '42px' }}>
                  <span className="excel-col-letter">#</span>
                </th>
                <th className="excel-col-head text-start ps-3" style={{ width: '36%' }}>
                  <span className="excel-col-letter">A</span>
                  Particulars / Description
                </th>
                <th className="excel-col-head text-end pe-3" style={{ width: '9%' }}>
                  <span className="excel-col-letter">B</span>
                  Qty
                </th>
                <th className="excel-col-head" style={{ width: '9%' }}>
                  <span className="excel-col-letter">C</span>
                  Unit
                </th>
                <th className="excel-col-head text-end pe-3" style={{ width: '13%' }}>
                  <span className="excel-col-letter">D</span>
                  Rate (₹)
                </th>
                <th className="excel-col-head text-end pe-2" style={{ width: '9%' }}>
                  <span className="excel-col-letter">E</span>
                  GST %
                </th>
                <th className="excel-col-head text-end pe-2" style={{ width: '11%' }}>
                  <span className="excel-col-letter">F</span>
                  {invoiceType === 'central' ? 'IGST (₹)' : 'GST Split (₹)'}
                </th>
                <th className="excel-col-head text-end pe-3" style={{ width: '12%' }}>
                  <span className="excel-col-letter">G</span>
                  Total (₹)
                </th>
                <th className="excel-col-head" style={{ width: '40px' }}>
                  <span className="excel-col-letter">✕</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty = Number(item.quantity || 1);
                const rate = Number(item.rate || 0);
                const gstPercent = Number(item.gstPercent || 0);
                const amount = qty * rate;
                const gstAmount = (amount * gstPercent) / 100;
                const lineTotal = amount + gstAmount;

                return (
                  <tr key={item.id}>
                    {/* Excel Row Number */}
                    <td className="excel-row-num">{idx + 1}</td>

                    {/* Column A: Item Description (HSN automatically attached from item master) */}
                    <td>
                      <input
                        className="excel-cell-input fw-semibold"
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, idx)}
                        placeholder="Type item or search stock catalog..."
                        list="stock-items-catalog"
                        autoFocus={idx === items.length - 1 && !item.description}
                      />
                      {item.hsn && (
                        <div className="px-2 pb-1" style={{ marginTop: '-4px' }}>
                          <span
                            className="badge bg-light text-secondary border font-monospace"
                            style={{ fontSize: '0.68rem', fontWeight: 500 }}
                            title={`Tax Compliance: HSN/SAC ${item.hsn} auto-linked to this item`}
                          >
                            HSN: {item.hsn}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Column B: Quantity */}
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="excel-cell-input font-monospace text-end"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, idx)}
                      />
                    </td>

                    {/* Column C: Unit */}
                    <td>
                      <select
                        className="excel-cell-select"
                        value={item.unit || DEFAULT_UNIT}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        title="Unit of Measurement (UOM)"
                      >
                        {GST_UNITS.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.code}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Column D: Rate */}
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="excel-cell-input font-monospace text-end fw-semibold"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, idx)}
                      />
                    </td>

                    {/* Column E: GST % */}
                    <td>
                      <select
                        className="excel-cell-select text-end font-monospace"
                        value={item.gstPercent}
                        onChange={(e) => updateItem(item.id, 'gstPercent', e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, idx)}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    {/* Column F: Tax Split */}
                    <td className="text-end">
                      <div className="excel-cell-readonly font-monospace small">
                        {invoiceType === 'central' ? (
                          <span className="text-primary">
                            ₹{gstAmount.toFixed(2)} (IGST)
                          </span>
                        ) : (
                          <span className="text-secondary">
                            ₹{(gstAmount / 2).toFixed(2)} + ₹{(gstAmount / 2).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column G: Line Total */}
                    <td className="text-end">
                      <div className="excel-cell-readonly font-monospace fw-bold text-success">
                        ₹{lineTotal.toFixed(2)}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0 text-decoration-none"
                        title="Remove row"
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
                  <td colSpan="9" className="text-center py-5 text-muted bg-light">
                    <div className="fs-1 mb-2">📊</div>
                    <h3 className="h6 fw-bold mb-1">Spreadsheet is Empty</h3>
                    <p className="small text-muted mb-3">
                      Add rows manually, paste multi-cell data from Excel, or insert from your stock inventory.
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-sm fw-bold px-3"
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
                        ＋ Add Blank Row
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm fw-bold px-3"
                        onClick={() => setShowExcelPasteModal(true)}
                      >
                        📋 Paste from Excel
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setShowAddItemModal(true)}
                      >
                        📦 Stock Catalog
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

      {/* Excel Paste Range Dialog */}
      {showExcelPasteModal && (
        <div
          className="modal show d-block animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-4">📋</span>
                  <div>
                    <h5 className="modal-title fw-bold mb-0 text-white">Paste Data from Excel / Google Sheets</h5>
                    <small className="text-white-50">Directly paste spreadsheet cells into your invoice line items</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowExcelPasteModal(false)}
                />
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-2">
                  Select rows and columns in <strong>Microsoft Excel</strong>, <strong>Google Sheets</strong>, or Busy/Tally, press <strong>Ctrl+C</strong> to copy, then paste (<strong>Ctrl+V</strong>) into the box below:
                </p>
                <textarea
                  className="form-control font-monospace mb-3"
                  rows={8}
                  placeholder={`Description\tHSN\tQty\tUnit\tRate\tGST\nLED Panel Light 12W\t8539\t10\tPCS\t180\t18\nCopper Wiring 90m\t8544\t2\tCOIL\t1450\t18`}
                  value={excelPastedText}
                  onChange={(e) => setExcelPastedText(e.target.value)}
                  autoFocus
                />
                <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-0">
                  <span>💡</span>
                  <div>
                    <strong>Smart Auto-Detection:</strong> Tread automatically extracts Item Names, HSN codes, Quantities, Rates, and GST percentages from both tab-separated and comma-separated rows.
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light py-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowExcelPasteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold px-4 shadow-sm"
                  onClick={() => {
                    const count = parseAndAddExcelRows(excelPastedText);
                    if (count > 0) {
                      setExcelPastedText('');
                      setShowExcelPasteModal(false);
                      alert(`✓ Successfully added ${count} items from Excel!`);
                    } else {
                      alert('Please paste some Excel row data with description and rates.');
                    }
                  }}
                  disabled={!excelPastedText.trim()}
                >
                  ＋ Insert into Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


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
