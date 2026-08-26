import { useState, useMemo, useDeferredValue } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { validateGSTIN, GST_STATE_CODES, parseGSTPortalText } from '../../services/gstinValidator.js';
import CustomerExcelImport from './CustomerExcelImport.jsx';

const EMPTY_FORM = {
  name: '',
  type: 'Customer', // 'Customer' (Sales) | 'Vendor' (Purchase) | 'Both'
  phone: '',
  email: '',
  address: '',
  gstin: '',
  notes: '',
};

function createEmptyForm() {
  return { ...EMPTY_FORM };
}

function CustomersPage({
  customers = [],
  onSave,
  onDelete,
  onLoadToInvoice,
  onBack,
  initialShowAdd = false,
  initialMode = 'list',
}) {
  const [showForm, setShowForm] = useState(initialShowAdd);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [search, setSearch] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState('all'); // 'all' | 'Customer' | 'Vendor'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const deferredSearch = useDeferredValue(search);

  // Dedicated GSTIN Lookup Tool State
  const [showGstLookupTool, setShowGstLookupTool] = useState(false);
  const [gstSearchInput, setGstSearchInput] = useState('');
  const [gstSearchResult, setGstSearchResult] = useState(null);

  // Paste from GST Portal Box State
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedPortalText, setPastedPortalText] = useState('');

  function EMPTY_ITEM_OR_FORM() {
    return { ...EMPTY_FORM };
  }

  // Real-time analysis for modal form's GSTIN input
  const formGstinAnalysis = useMemo(() => {
    if (!form.gstin || !form.gstin.trim()) return null;
    return validateGSTIN(form.gstin);
  }, [form.gstin]);

  // Handle Lookup in dedicated search tool
  const handlePerformGstLookup = (e) => {
    if (e) e.preventDefault();
    if (!gstSearchInput.trim()) {
      alert('Please enter a 15-digit GSTIN number to verify.');
      return;
    }
    const result = validateGSTIN(gstSearchInput.trim());
    setGstSearchResult(result);
  };

  // Quick import from verified GST result
  const handleAddFromGstResult = (targetType = 'Customer') => {
    if (!gstSearchResult || !gstSearchResult.gstin) return;
    setForm({
      ...EMPTY_FORM,
      type: targetType,
      gstin: gstSearchResult.gstin,
      address: gstSearchResult.stateName ? `${gstSearchResult.stateName}, India` : '',
      notes: `Verified GSTIN registered in ${gstSearchResult.stateName || 'India'} (${gstSearchResult.entityType || 'Business Entity'})`,
    });
    setEditingId(null);
    setShowForm(true);
  };

  // Auto-fill State Address from GSTIN
  const handleAutoFillStateAddress = () => {
    if (!form.gstin || form.gstin.length < 2) {
      alert('Please enter at least the first 2 digits of the GSTIN (State Code).');
      return;
    }
    const stateCode = form.gstin.slice(0, 2);
    const stateName = GST_STATE_CODES[stateCode];
    if (stateName) {
      setForm((f) => ({
        ...f,
        address: `${stateName}, State Code: ${stateCode}, India`,
      }));
    } else {
      alert(`Unrecognized State Code '${stateCode}'.`);
    }
  };

  // Parse and apply copied GST Portal details
  const handleApplyPastedPortalDetails = () => {
    if (!pastedPortalText.trim()) {
      alert('Please paste the details or address copied from the GST Portal.');
      return;
    }
    const parsed = parseGSTPortalText(pastedPortalText);
    if (parsed.success) {
      setForm((f) => ({
        ...f,
        name: parsed.businessName || parsed.legalName || f.name,
        gstin: parsed.gstin || f.gstin,
        address: parsed.address || f.address || (parsed.state ? `${parsed.state}, India` : f.address),
        notes: parsed.status ? `GST Status: ${parsed.status}` : f.notes,
      }));
      setPastedPortalText('');
      setShowPasteBox(false);
    } else {
      alert('Could not automatically identify the address or business details. Please check the text and try again.');
    }
  };

  // Count by category
  const countSalesCustomers = useMemo(
    () => customers.filter((c) => !c.type || c.type === 'Customer' || c.type === 'Both').length,
    [customers]
  );
  const countPurchaseVendors = useMemo(
    () => customers.filter((c) => c.type === 'Vendor' || c.type === 'Both').length,
    [customers]
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = deferredSearch.toLowerCase();
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.gstin?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTypeTab === 'Customer') {
        matchesTab = !c.type || c.type === 'Customer' || c.type === 'Both';
      } else if (activeTypeTab === 'Vendor') {
        matchesTab = c.type === 'Vendor' || c.type === 'Both';
      }

      return matchesSearch && matchesTab;
    });
  }, [customers, deferredSearch, activeTypeTab]);

  const openCreate = (defaultType = 'Customer') => {
    setForm({ ...EMPTY_FORM, type: defaultType });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (customer) => {
    setForm({
      name: customer.name || '',
      type: customer.type || 'Customer',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      notes: customer.notes || '',
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter a party / customer name.');
      return;
    }

    if (editingId) {
      const updated = customers.map((c) =>
        c.id === editingId
          ? {
              ...c,
              ...form,
              name: form.name.trim(),
              gstin: form.gstin.trim().toUpperCase(),
            }
          : c
      );
      onSave(updated);
    } else {
      const newCustomer = {
        id: uuidv4(),
        ...form,
        name: form.name.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      onSave([newCustomer, ...customers]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_ITEM_OR_FORM());
  };

  const handleDelete = (id) => {
    onDelete(id);
    setConfirmDelete(null);
  };

  const exportPartiesExcel = () => {
    const data = customers.map((c) => ({
      'Customer / Party Name': c.name || '',
      'Party Type': c.type || 'Customer',
      'Mobile Number': c.phone || '',
      'Email Address': c.email || '',
      'GSTIN Number': c.gstin || '',
      'Billing Address': c.address || '',
      'Notes / Remarks': c.notes || '',
      'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 14 },
      { wch: 16 },
      { wch: 26 },
      { wch: 18 },
      { wch: 38 },
      { wch: 24 },
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers_Directory');
    XLSX.writeFile(workbook, `Customers_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPartiesCSV = () => {
    const rows = [['Party Name', 'Party Type', 'Phone', 'Email', 'GSTIN', 'Billing Address', 'Created Date']];
    customers.forEach((c) => {
      rows.push([
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.type || 'Customer'}"`,
        `"${c.phone || ''}"`,
        `"${c.email || ''}"`,
        `"${c.gstin || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.createdAt || ''}"`,
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customers_and_Vendors_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="py-3">
      {/* Modify Account Banner */}
      {initialMode === 'modify' && (
        <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 rounded-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-5">👥</span>
            <div>
              <strong className="d-block">Modify Party / Account Mode</strong>
              <small className="text-muted">Search or locate any Customer / Vendor below and click <strong>&quot;✏️ Edit&quot;</strong> to update their name, GSTIN, phone, or address.</small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => {
              setForm(EMPTY_ITEM_OR_FORM());
              setEditingId(null);
              setShowForm(true);
            }}
          >
            ＋ Add New Party
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">
            {initialMode === 'modify' ? '👥 Modify Accounts & Parties' : '👥 Customers & Vendors Directory'}
          </h1>
          <p className="text-muted mb-0">
            {initialMode === 'modify'
              ? 'Update existing buyer and supplier master ledger details.'
              : 'Save buyer and supplier accounts for fast invoice billing (Sales) and inventory stocking (Purchase).'}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {onBack && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
              ← Back to Dashboard
            </button>
          )}
          <button
            type="button"
            className={`btn btn-sm fw-bold ${showExcelImport ? 'btn-success' : 'btn-outline-success shadow-xs'}`}
            onClick={() => setShowExcelImport((prev) => !prev)}
            title="Import customer and vendor directory from Excel spreadsheet (.xlsx, .xls, .csv)"
          >
            📊 {showExcelImport ? 'Hide Excel Importer' : '📥 Import from Excel'}
          </button>
          <button
            type="button"
            className={`btn btn-sm fw-semibold ${showGstLookupTool ? 'btn-info text-white' : 'btn-outline-info'}`}
            onClick={() => setShowGstLookupTool((prev) => !prev)}
            title="Search and verify any 15-digit GST number"
          >
            🔍 {showGstLookupTool ? 'Hide GSTIN Tool' : 'Search & Verify GSTIN'}
          </button>
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              disabled={customers.length === 0}
            >
              📤 Export Directory
            </button>
            <ul className="dropdown-menu shadow-sm">
              <li>
                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={exportPartiesExcel}
                >
                  <span>📊</span> Export to Excel (.XLSX)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={exportPartiesCSV}
                >
                  <span>📄</span> Export to CSV (.CSV)
                </button>
              </li>
            </ul>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={() => openCreate('Vendor')}
          >
            ＋ Add Vendor
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm fw-bold shadow-sm"
            onClick={() => openCreate('Customer')}
          >
            ＋ Add Customer
          </button>
        </div>
      </div>

      {/* Excel Importer Section */}
      {showExcelImport && (
        <CustomerExcelImport
          existingCustomers={customers}
          onConfirmImport={(updated) => {
            onSave(updated);
            setShowExcelImport(false);
          }}
          onCancel={() => setShowExcelImport(false)}
        />
      )}

      {/* Dedicated GSTIN Search & Verification Tool */}
      {showGstLookupTool && (
        <div className="card shadow-sm border-info mb-4 bg-light">
          <div className="card-header bg-info text-white py-2 d-flex justify-content-between align-items-center">
            <span className="fw-bold">🔍 GSTIN Search, Verification & Taxpayer Lookup</span>
            <button
              type="button"
              className="btn-close btn-close-white btn-sm"
              onClick={() => setShowGstLookupTool(false)}
            />
          </div>
          <div className="card-body">
            <p className="small text-muted mb-3">
              Enter any 15-digit Indian GSTIN number to verify its checksum, jurisdiction state, constitution/entity type, and prevent billing mistakes.
            </p>
            <form onSubmit={handlePerformGstLookup} className="row g-2 align-items-center mb-3">
              <div className="col-sm-8 col-12">
                <div className="input-group">
                  <span className="input-group-text font-monospace fw-bold bg-white">GSTIN</span>
                  <input
                    type="text"
                    className="form-control text-uppercase font-monospace"
                    placeholder="e.g. 09ARGPM9069G1Z9, 07AAAAA0000A1Z5"
                    maxLength={15}
                    value={gstSearchInput}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setGstSearchInput(val);
                      if (val.length === 15) {
                        setGstSearchResult(validateGSTIN(val));
                      }
                    }}
                    autoFocus
                  />
                  {gstSearchInput && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setGstSearchInput('');
                        setGstSearchResult(null);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="col-sm-4 col-12 d-flex gap-2">
                <button type="submit" className="btn btn-info text-white flex-grow-1 fw-semibold">
                  🔍 Check Validity
                </button>
              </div>
            </form>

            {/* Result View */}
            {gstSearchResult && (
              <div
                className={`p-3 rounded-3 border ${
                  gstSearchResult.isValid
                    ? 'bg-success-subtle border-success text-success-emphasis'
                    : 'bg-warning-subtle border-warning text-dark'
                }`}
              >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-2 pb-2 border-bottom">
                  <div>
                    <span className="badge me-2" style={{ backgroundColor: gstSearchResult.isValid ? '#198754' : '#fd7e14' }}>
                      {gstSearchResult.isValid ? '✓ Valid GSTIN Structure & Checksum' : '⚠️ GSTIN Requires Review'}
                    </span>
                    <strong className="font-monospace fs-5">{gstSearchResult.gstin}</strong>
                  </div>
                  <div className="d-flex gap-2">
                    <a
                      href={gstSearchResult.portalUrl || `https://services.gst.gov.in/services/searchtp?gstin=${gstSearchResult.gstin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-dark fw-semibold"
                    >
                      🌐 Official GST Portal Lookup ↗
                    </a>
                  </div>
                </div>

                <div className="row g-2 small">
                  <div className="col-md-3 col-6">
                    <span className="text-muted d-block">State / Jurisdiction:</span>
                    <strong>{gstSearchResult.stateName || 'Unknown State'} ({gstSearchResult.stateCode || '—'})</strong>
                  </div>
                  <div className="col-md-3 col-6">
                    <span className="text-muted d-block">Constitution / Entity:</span>
                    <strong>{gstSearchResult.entityType || '—'}</strong>
                  </div>
                  <div className="col-md-3 col-6">
                    <span className="text-muted d-block">Associated PAN:</span>
                    <strong className="font-monospace">{gstSearchResult.pan || '—'}</strong>
                  </div>
                  <div className="col-md-3 col-6">
                    <span className="text-muted d-block">Mod-36 Checksum:</span>
                    <strong>{gstSearchResult.isChecksumValid ? 'Verified Match ✓' : 'Mismatch / Manual Check'}</strong>
                  </div>
                </div>

                {gstSearchResult.errorMessage && (
                  <div className="alert alert-danger py-1 px-2 mt-2 mb-0 small">
                    {gstSearchResult.errorMessage}
                  </div>
                )}

                <div className="mt-3 pt-2 border-top d-flex gap-2 flex-wrap">
                  <span className="small text-muted align-self-center me-1">Quick Action:</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={() => handleAddFromGstResult('Customer')}
                  >
                    ＋ Add as Sales Customer
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddFromGstResult('Vendor')}
                  >
                    ＋ Add as Purchase Vendor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-12">
          <div
            className={`card shadow-sm border-0 p-3 ${activeTypeTab === 'all' ? 'border border-primary bg-primary-subtle' : 'bg-light'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTypeTab('all')}
          >
            <div className="text-muted small fw-bold text-uppercase">Total Registered Parties</div>
            <div className="h3 fw-bold text-dark mb-0">{customers.length}</div>
            <small className="text-muted">All active contacts</small>
          </div>
        </div>
        <div className="col-md-4 col-6">
          <div
            className={`card shadow-sm border-0 p-3 ${activeTypeTab === 'Customer' ? 'border border-success bg-success-subtle' : 'bg-light'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTypeTab('Customer')}
          >
            <div className="text-muted small fw-bold text-uppercase">🛒 Sales Customers</div>
            <div className="h3 fw-bold text-success mb-0">{countSalesCustomers}</div>
            <small className="text-muted">Buyers / Debtors for Invoicing</small>
          </div>
        </div>
        <div className="col-md-4 col-6">
          <div
            className={`card shadow-sm border-0 p-3 ${activeTypeTab === 'Vendor' ? 'border border-info bg-info-subtle' : 'bg-light'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTypeTab('Vendor')}
          >
            <div className="text-muted small fw-bold text-uppercase">📦 Purchase Vendors</div>
            <div className="h3 fw-bold text-primary mb-0">{countPurchaseVendors}</div>
            <small className="text-muted">Suppliers / Creditors for Stock</small>
          </div>
        </div>
      </div>

      {/* Search Bar & Tab Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="input-group" style={{ maxWidth: '450px' }}>
            <span className="input-group-text bg-light border-end-0">🔍</span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by customer name, phone, email, GSTIN, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setSearch('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${activeTypeTab === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTypeTab('all')}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              className={`btn ${activeTypeTab === 'Customer' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTypeTab('Customer')}
            >
              🛒 Sales Customers ({countSalesCustomers})
            </button>
            <button
              type="button"
              className={`btn ${activeTypeTab === 'Vendor' ? 'btn-info text-white' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTypeTab('Vendor')}
            >
              📦 Purchase Vendors ({countPurchaseVendors})
            </button>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div className="fs-1 mb-2">👥</div>
              <h3 className="h5 fw-bold mb-2">
                {search || activeTypeTab !== 'all' ? 'No parties match your filter.' : 'No customer or vendor records saved yet.'}
              </h3>
              <p className="text-muted small mb-3">
                Save customer names for Sales Invoices or vendor names for Purchase Inventory.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => openCreate('Customer')}
                >
                  ＋ Add Sales Customer
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => openCreate('Vendor')}
                >
                  ＋ Add Purchase Vendor
                </button>
              </div>
            </div>
          ) : (
            <div className="table-responsive" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="table table-hover align-middle mb-0" style={{ minWidth: '760px' }}>
                <thead className="table-light">
                  <tr>
                    <th>Party / Business Name</th>
                    <th>Type / Purpose</th>
                    <th>Mobile / Phone</th>
                    <th>Email</th>
                    <th>GSTIN</th>
                    <th>Billing Address</th>
                    <th className="text-center" style={{ width: '160px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => {
                    const isVendor = customer.type === 'Vendor';
                    const isBoth = customer.type === 'Both';

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="fw-semibold text-dark">{customer.name}</div>
                          <small className="text-muted">
                            {customer.createdAt
                              ? `Added ${new Date(customer.createdAt).toLocaleDateString('en-IN')}`
                              : 'Saved Contact'}
                          </small>
                        </td>
                        <td>
                          {isVendor ? (
                            <span className="badge bg-info text-white">📦 Purchase Vendor</span>
                          ) : isBoth ? (
                            <span className="badge bg-secondary">🔄 Sales & Purchase</span>
                          ) : (
                            <span className="badge bg-success">🛒 Sales Customer</span>
                          )}
                        </td>
                        <td>{customer.phone || <span className="text-muted">—</span>}</td>
                        <td>{customer.email || <span className="text-muted">—</span>}</td>
                        <td>
                          {customer.gstin ? (
                            <div>
                              <div className="d-flex align-items-center gap-1">
                                <code className="fw-bold text-dark">{customer.gstin}</code>
                                <a
                                  href={`https://services.gst.gov.in/services/searchtp?gstin=${customer.gstin}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-decoration-none text-primary small fw-bold"
                                  title="Verify on Official GST Portal"
                                >
                                  ↗
                                </a>
                              </div>
                              {GST_STATE_CODES[customer.gstin.slice(0, 2)] && (
                                <span className="badge bg-light text-secondary border font-monospace mt-1" style={{ fontSize: '0.7rem' }}>
                                  📍 {GST_STATE_CODES[customer.gstin.slice(0, 2)]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">{customer.address || '—'}</small>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            {onLoadToInvoice && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success py-0 px-2"
                                title="Load into Invoice"
                                onClick={() => onLoadToInvoice(customer)}
                              >
                                📝 Use
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              title="Edit contact"
                              onClick={() => openEdit(customer)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-0 px-2"
                              title="Delete contact"
                              onClick={() => setConfirmDelete(customer.id)}
                            >
                              🗑️
                            </button>
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
        {filtered.length > 0 && (
          <div className="card-footer bg-light text-muted small py-2 px-3">
            Showing {filtered.length} of {customers.length} party account{customers.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1200 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h2 className="modal-title h5 mb-0">
                  {editingId
                    ? '✏️ Edit Contact / Party'
                    : form.type === 'Vendor'
                    ? '＋ Add New Vendor (Purchase)'
                    : '＋ Add New Customer (Sales)'}
                </h2>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowForm(false)}
                />
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {/* Party Purpose Type */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Account Purpose / Classification *</label>
                    <select
                      className="form-select"
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      <option value="Customer">🛒 Sales Customer (Buyer / Client for Invoices)</option>
                      <option value="Vendor">📦 Purchase Vendor (Supplier for Stock & Inventory)</option>
                      <option value="Both">🔄 Both (Sales & Purchase Partner)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Party / Business Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sharma Traders, ABC Infotech"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="contact@business.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-semibold mb-0">GSTIN Number (optional)</label>
                      {form.gstin && (
                        <a
                          href={`https://services.gst.gov.in/services/searchtp?gstin=${form.gstin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="small text-decoration-none"
                        >
                          Check on GST Portal ↗
                        </a>
                      )}
                    </div>
                    <div className="input-group">
                      <span className="input-group-text font-monospace small bg-white">15-char</span>
                      <input
                        type="text"
                        className={`form-control font-monospace ${
                          formGstinAnalysis
                            ? formGstinAnalysis.isValid
                              ? 'is-valid'
                              : 'is-invalid'
                            : ''
                        }`}
                        placeholder="e.g. 09ARGPM9069G1Z9"
                        value={form.gstin}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))
                        }
                        maxLength={15}
                      />
                    </div>

                    {/* Real-time GSTIN validation feedback */}
                    {formGstinAnalysis && (
                      <div className="mt-2">
                        {formGstinAnalysis.isValid ? (
                          <div className="alert alert-success py-1 px-2 mb-0 small d-flex justify-content-between align-items-center">
                            <span>
                              ✓ <strong>Valid GSTIN:</strong> {formGstinAnalysis.stateName} ({formGstinAnalysis.entityType})
                            </span>
                            <span className="badge bg-success">Verified</span>
                          </div>
                        ) : (
                          <div className="alert alert-danger py-1 px-2 mb-0 small">
                            ⚠️ {formGstinAnalysis.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                      <label className="form-label fw-semibold mb-0">Billing / Office Address</label>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary py-0 px-2 small"
                          onClick={handleAutoFillStateAddress}
                          title="Auto-fill registered State and Code from GSTIN"
                        >
                          📍 Auto-Fill State
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-primary py-0 px-2 small fw-semibold"
                          onClick={() => setShowPasteBox((prev) => !prev)}
                          title="Paste full taxpayer address details copied from GST portal"
                        >
                          📋 {showPasteBox ? 'Hide Paste Box' : 'Paste from GST Portal'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Paste from GST Portal Collapsible Box */}
                    {showPasteBox && (
                      <div className="p-3 bg-light border rounded-3 mb-2 small">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong className="text-primary">📋 Paste GST Portal Details / Address:</strong>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Auto-extracts Name, Address & Pincode</span>
                        </div>
                        <textarea
                          className="form-control form-control-sm mb-2 font-monospace"
                          rows={3}
                          placeholder="Copy taxpayer screen or Principal Place of Business address from services.gst.gov.in and paste here..."
                          value={pastedPortalText}
                          onChange={(e) => setPastedPortalText(e.target.value)}
                        />
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary py-0 px-2"
                            onClick={() => {
                              setPastedPortalText('');
                              setShowPasteBox(false);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary py-0 px-3 fw-bold"
                            onClick={handleApplyPastedPortalDetails}
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
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>

                  <div className="mb-1">
                    <label className="form-label fw-semibold">Notes / Description (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Key supplier for computer hardware"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4">
                    {editingId ? '💾 Save Changes' : '＋ Save Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1300 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h2 className="modal-title h6 mb-0">🗑️ Delete Contact</h2>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete <strong>{customers.find((c) => c.id === confirmDelete)?.name}</strong>? This cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(confirmDelete)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomersPage;
