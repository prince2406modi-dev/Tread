import { useState, useMemo, useDeferredValue } from 'react';
import ActionFolder from '../Common/ActionFolder.jsx';

export default function PaymentManager({
  payments = [],
  onSavePayments,
  customers = [],
  invoices = [],
  purchaseBills = [],
  company = {},
  initialMode = 'list',
}) {
  const [activeTab, setActiveTab] = useState(initialMode === 'add' ? 'create' : 'register');
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [selectedPaymentForView, setSelectedPaymentForView] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const deferredSearch = useDeferredValue(searchQuery);

  // Auto voucher number generator
  const getNextVoucherNumber = (type) => {
    const year = new Date().getFullYear();
    const prefix = type === 'Payment In' ? 'RCP' : 'PAY';
    const count = (payments || []).filter((p) => p.type === type).length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  // Form State
  const [formData, setFormData] = useState({
    voucherNumber: getNextVoucherNumber('Payment In'),
    type: 'Payment In', // 'Payment In' (Receipt) or 'Payment Out' (Payment)
    date: new Date().toISOString().slice(0, 10),
    partyName: '',
    partyPhone: '',
    partyGstin: '',
    amount: '',
    paymentMode: 'UPI',
    referenceNumber: '',
    bankAccount: '',
    linkedDocument: '',
    narration: '',
  });

  // Handle voucher type switch
  const handleTypeChange = (newType) => {
    setFormData((prev) => ({
      ...prev,
      type: newType,
      voucherNumber: getNextVoucherNumber(newType),
      partyName: '',
      partyPhone: '',
      partyGstin: '',
      linkedDocument: '',
    }));
  };

  // Handle party select
  const handlePartySelect = (name) => {
    const party = customers.find((c) => c && c.name && c.name.trim().toLowerCase() === (name || '').trim().toLowerCase());
    if (party) {
      setFormData((prev) => ({
        ...prev,
        partyName: party.name,
        partyPhone: party.phone || '',
        partyGstin: party.gstin || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, partyName: name }));
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      voucherNumber: getNextVoucherNumber('Payment In'),
      type: 'Payment In',
      date: new Date().toISOString().slice(0, 10),
      partyName: '',
      partyPhone: '',
      partyGstin: '',
      amount: '',
      paymentMode: 'UPI',
      referenceNumber: '',
      bankAccount: '',
      linkedDocument: '',
      narration: '',
    });
    setEditingPaymentId(null);
  };

  // Save voucher
  const handleSavePayment = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.partyName) {
      alert('Please specify a party (Customer or Vendor) name.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than zero.');
      return;
    }

    const record = {
      ...formData,
      amount: parsedAmount,
      id: editingPaymentId || `pay_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    let updated;
    if (editingPaymentId) {
      updated = payments.map((p) => (p.id === editingPaymentId ? record : p));
    } else {
      updated = [record, ...payments];
    }

    onSavePayments(updated);
    alert(editingPaymentId ? '✓ Payment voucher updated!' : '✓ Payment recorded successfully!');
    resetForm();
    setActiveTab('register');
  };

  // Edit voucher
  const handleEdit = (item) => {
    setFormData({
      voucherNumber: item.voucherNumber,
      type: item.type,
      date: item.date,
      partyName: item.partyName,
      partyPhone: item.partyPhone || '',
      partyGstin: item.partyGstin || '',
      amount: String(item.amount),
      paymentMode: item.paymentMode || 'UPI',
      referenceNumber: item.referenceNumber || '',
      bankAccount: item.bankAccount || '',
      linkedDocument: item.linkedDocument || '',
      narration: item.narration || '',
    });
    setEditingPaymentId(item.id);
    setActiveTab('create');
  };

  // Delete voucher
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this payment voucher?')) {
      const updated = payments.filter((p) => p.id !== id);
      onSavePayments(updated);
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return (payments || []).filter((p) => {
      const q = deferredSearch.toLowerCase();
      const matchSearch =
        !q ||
        p.voucherNumber?.toLowerCase().includes(q) ||
        p.partyName?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q) ||
        p.linkedDocument?.toLowerCase().includes(q);

      const matchType = typeFilter === 'ALL' || p.type === typeFilter;
      const matchMode = modeFilter === 'ALL' || p.paymentMode === modeFilter;

      return matchSearch && matchType && matchMode;
    });
  }, [payments, deferredSearch, typeFilter, modeFilter]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let todayTotal = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    (payments || []).forEach((p) => {
      const amt = parseFloat(p.amount) || 0;
      if (p.type === 'Payment In') {
        totalIn += amt;
        if (p.date === todayStr) todayTotal += amt;
      } else {
        totalOut += amt;
        if (p.date === todayStr) todayTotal -= amt;
      }
    });

    const netFlow = totalIn - totalOut;

    return {
      totalIn,
      totalOut,
      netFlow,
      todayTotal,
      count: payments?.length || 0,
    };
  }, [payments]);

  // Party candidates based on type
  const partyList = useMemo(() => {
    if (formData.type === 'Payment In') {
      // Customers / Debtors
      return customers.filter((c) => {
        const t = (c.type || '').toLowerCase();
        const g = (c.groupName || '').toLowerCase();
        return t === 'customer' || t === 'both' || !t || g.includes('debtor') || !g.includes('creditor');
      });
    }
    // Vendors / Creditors / Suppliers
    return customers.filter((c) => {
      const t = (c.type || '').toLowerCase();
      const g = (c.groupName || '').toLowerCase();
      return t === 'vendor' || t === 'both' || g.includes('creditor') || g.includes('supplier');
    });
  }, [customers, formData.type]);

  // Document candidates for linking
  const docCandidates = useMemo(() => {
    if (formData.type === 'Payment In') {
      return (invoices || []).map((inv) => ({
        label: `Inv #${inv.invoiceNumber} - ${inv.customerName} (₹${inv.grandTotal || inv.total || 0})`,
        value: inv.invoiceNumber,
      }));
    }
    return (purchaseBills || []).map((bill) => ({
      label: `Bill #${bill.billNumber} - ${bill.vendorName} (₹${bill.totalAmount || bill.grandTotal || 0})`,
      value: bill.billNumber,
    }));
  }, [formData.type, invoices, purchaseBills]);

  return (
    <div className="container-fluid py-3 px-3 px-md-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-inline-flex align-items-center gap-2 px-2 py-1 mb-1 rounded bg-success bg-opacity-10 text-success small fw-bold">
            <span>💵 TRANSACTIONS</span>
            <span>/</span>
            <span>PAYMENTS &amp; RECEIPTS</span>
          </div>
          <h1 className="h4 fw-bold mb-0 text-dark">Payments &amp; Receipt Vouchers</h1>
          <p className="text-muted small mb-0">
            Record customer collections, vendor disbursements, manage cash flow, and print vouchers.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm px-3 fw-bold ${
              activeTab === 'register' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
            }`}
            onClick={() => setActiveTab('register')}
          >
            📑 Payment Register ({payments?.length || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm px-3 fw-bold ${
              activeTab === 'create' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
            }`}
            onClick={() => {
              resetForm();
              setActiveTab('create');
            }}
          >
            ＋ New Voucher
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-success">
            <div className="text-muted small fw-semibold text-uppercase">Total Collections (In)</div>
            <div className="h4 fw-bold text-success mb-0 mt-1">
              ₹{metrics.totalIn.toLocaleString('en-IN')}
            </div>
            <div className="small text-muted mt-1">Receipts from clients</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-danger">
            <div className="text-muted small fw-semibold text-uppercase">Total Outflow (Paid)</div>
            <div className="h4 fw-bold text-danger mb-0 mt-1">
              ₹{metrics.totalOut.toLocaleString('en-IN')}
            </div>
            <div className="small text-muted mt-1">Vendor &amp; expense payouts</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-primary">
            <div className="text-muted small fw-semibold text-uppercase">Net Cash Flow</div>
            <div className={`h4 fw-bold mb-0 mt-1 ${metrics.netFlow >= 0 ? 'text-primary' : 'text-danger'}`}>
              ₹{metrics.netFlow.toLocaleString('en-IN')}
            </div>
            <div className="small text-muted mt-1">Inflow minus Outflow</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-info">
            <div className="text-muted small fw-semibold text-uppercase">Today's Net Activity</div>
            <div className="h4 fw-bold text-info mb-0 mt-1">
              ₹{metrics.todayTotal.toLocaleString('en-IN')}
            </div>
            <div className="small text-muted mt-1">Recorded today</div>
          </div>
        </div>
      </div>

      {/* ================= REGISTER VIEW ================= */}
      {activeTab === 'register' && (
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
          {/* Filters Bar */}
          <div className="p-3 bg-light border-bottom d-flex flex-column flex-md-row gap-2 justify-content-between align-items-md-center">
            <div className="position-relative flex-grow-1" style={{ maxWidth: '380px' }}>
              <input
                type="text"
                className="form-control form-control-sm ps-4"
                placeholder="🔍 Search vouchers by #, party, UTR, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted fw-semibold">Type:</span>
                <select
                  className="form-select form-select-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ width: '150px' }}
                >
                  <option value="ALL">All Types</option>
                  <option value="Payment In">Payment In (Receipt)</option>
                  <option value="Payment Out">Payment Out</option>
                </select>
              </div>

              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted fw-semibold">Mode:</span>
                <select
                  className="form-select form-select-sm"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  style={{ width: '130px' }}
                >
                  <option value="ALL">All Modes</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-muted text-uppercase">
                <tr>
                  <th style={{ width: '120px' }}>Voucher #</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '130px' }}>Type</th>
                  <th>Party Name</th>
                  <th style={{ width: '120px' }}>Mode</th>
                  <th style={{ width: '130px' }}>Reference</th>
                  <th className="text-end" style={{ width: '140px' }}>Amount (₹)</th>
                  <th className="text-end" style={{ width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div className="fs-1 mb-2">💵</div>
                      <h6 className="fw-bold mb-1">No payment vouchers recorded</h6>
                      <p className="small text-muted mb-3">
                        {searchQuery ? 'No vouchers match your filters.' : 'Record customer receipts or vendor payments.'}
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm px-3 fw-bold"
                        onClick={() => {
                          resetForm();
                          setActiveTab('create');
                        }}
                      >
                        ＋ Create Voucher
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isIn = p.type === 'Payment In';
                    return (
                      <tr key={p.id}>
                        <td className="fw-bold text-dark">{p.voucherNumber}</td>
                        <td className="small text-muted">{p.date}</td>
                        <td>
                          <span
                            className={`badge ${
                              isIn ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'
                            }`}
                            style={{ fontSize: '11px', fontWeight: 600 }}
                          >
                            {isIn ? '↓ Payment In' : '↑ Payment Out'}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{p.partyName}</div>
                          {p.linkedDocument && (
                            <div className="small text-muted">Ref Doc: {p.linkedDocument}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="small text-muted">
                          {p.referenceNumber || '—'}
                        </td>
                        <td className={`text-end fw-bold ${isIn ? 'text-success' : 'text-danger'}`}>
                          {isIn ? '+' : '-'}₹{(p.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-end">
                          <ActionFolder
                            primaryAction={{
                              label: 'Preview',
                              icon: '👁️',
                              title: 'View & Print Receipt',
                              onClick: () => setSelectedPaymentForView(p),
                            }}
                            actions={[
                              {
                                label: 'Edit Voucher',
                                icon: '✏️',
                                onClick: () => handleEdit(p),
                              },
                              { divider: true },
                              {
                                label: 'Delete Voucher',
                                icon: '🗑️',
                                variant: 'danger',
                                onClick: () => handleDelete(p.id),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= CREATE / MODIFY VIEW ================= */}
      {activeTab === 'create' && (
        <form onSubmit={handleSavePayment}>
          <div className="card border-0 shadow-sm rounded-3 bg-white p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
              <h2 className="h5 fw-bold text-dark mb-0">
                {editingPaymentId ? '✏️ Modify Payment Voucher' : '＋ Record Payment / Receipt Voucher'}
              </h2>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setActiveTab('register')}
              >
                ← Back to Register
              </button>
            </div>

            {/* Voucher Type Switcher */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-2">
                Select Voucher Direction
              </label>
              <div className="d-flex gap-3">
                <button
                  type="button"
                  className={`btn px-4 py-2 fw-bold rounded-3 ${
                    formData.type === 'Payment In'
                      ? 'btn-success text-white shadow-sm'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleTypeChange('Payment In')}
                >
                  ↓ Payment In (Receipt from Customer)
                </button>
                <button
                  type="button"
                  className={`btn px-4 py-2 fw-bold rounded-3 ${
                    formData.type === 'Payment Out'
                      ? 'btn-danger text-white shadow-sm'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleTypeChange('Payment Out')}
                >
                  ↑ Payment Out (Payment to Vendor / Expense)
                </button>
              </div>
            </div>

            {/* Voucher Metadata */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Voucher Number *</label>
                <input
                  type="text"
                  className="form-control form-control-sm fw-bold"
                  value={formData.voucherNumber}
                  onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Date *</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Payment Mode *</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                >
                  <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque / Demand Draft</option>
                  <option value="Card">Debit / Credit Card</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Reference / UTR / Cheque #</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. UTR12345678"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Party Information */}
            <div className="p-3 rounded-3 bg-light border mb-4">
              <h3 className="h6 fw-bold text-primary mb-3">
                {formData.type === 'Payment In' ? '👤 Received From (Customer)' : '🏢 Paid To (Vendor / Supplier)'}
              </h3>
              <div className="row g-3">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold">Party Name *</label>
                  <input
                    type="text"
                    list="payment-party-list"
                    className="form-control form-control-sm fw-semibold"
                    placeholder="Type or select party..."
                    value={formData.partyName}
                    onChange={(e) => handlePartySelect(e.target.value)}
                    required
                  />
                  <datalist id="payment-party-list">
                    {partyList.map((p) => (
                      <option key={p.id || p.name} value={p.name} />
                    ))}
                  </datalist>
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label small fw-semibold">Contact Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formData.partyPhone}
                    onChange={(e) => setFormData({ ...formData, partyPhone: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">GSTIN</label>
                  <input
                    type="text"
                    className="form-control form-control-sm text-uppercase"
                    value={formData.partyGstin}
                    onChange={(e) => setFormData({ ...formData, partyGstin: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Amount & Account Details */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-primary">Amount (₹) *</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text fw-bold">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    className="form-control fw-bold fs-6"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold">Linked Bill / Invoice #</label>
                <input
                  type="text"
                  list="linked-docs-list"
                  className="form-control form-control-sm"
                  placeholder="Optional reference doc..."
                  value={formData.linkedDocument}
                  onChange={(e) => setFormData({ ...formData, linkedDocument: e.target.value })}
                />
                <datalist id="linked-docs-list">
                  {docCandidates.map((d, i) => (
                    <option key={i} value={d.value}>{d.label}</option>
                  ))}
                </datalist>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold">Deposit / Payment Account</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={company.bankName ? `${company.bankName} (${company.accountNumber || ''})` : 'Main Bank Account / Cash'}
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-semibold">Narration / Notes</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Cleared full balance for June invoices"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="d-flex justify-content-end gap-2 border-top pt-3">
              <button
                type="button"
                className="btn btn-outline-primary px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
                onClick={() => {
                  setSelectedPaymentForView({
                    ...formData,
                    id: editingPaymentId || 'pay-preview',
                    amount: parseFloat(formData.amount) || 0,
                  });
                }}
              >
                <span>👁️</span>
                <span>Preview Receipt</span>
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-4 fw-semibold"
                onClick={() => {
                  resetForm();
                  setActiveTab('register');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn px-5 fw-bold ${
                  formData.type === 'Payment In' ? 'btn-success' : 'btn-danger'
                }`}
              >
                {editingPaymentId ? '💾 Update Voucher' : '💾 Record Voucher'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================= VIEW / PRINT VOUCHER MODAL ================= */}
      {selectedPaymentForView && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className={`modal-header ${selectedPaymentForView.type === 'Payment In' ? 'bg-success' : 'bg-danger'} text-white py-3`}>
                <h5 className="modal-title fw-bold">
                  {selectedPaymentForView.type === 'Payment In' ? '💵 Official Receipt Voucher' : '💳 Official Payment Voucher'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedPaymentForView(null)}
                />
              </div>
              <div className="modal-body p-4" id="printable-payment-voucher">
                <div className="text-center border-bottom pb-3 mb-3">
                  <h5 className="fw-bold text-dark mb-1">{company.name || 'TREAD ENTERPRISE'}</h5>
                  <div className="small text-muted">{company.address || 'GST Registered Enterprise'}</div>
                  <div className="small text-muted">GSTIN: {company.gstin || 'N/A'}</div>
                </div>

                <div className="d-flex justify-content-between mb-3 small">
                  <div>
                    <span className="text-muted">Voucher No:</span> <strong>{selectedPaymentForView.voucherNumber}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Date:</span> <strong>{selectedPaymentForView.date}</strong>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 mb-3">
                  <div className="small text-muted text-uppercase fw-bold mb-1">
                    {selectedPaymentForView.type === 'Payment In' ? 'Received with thanks from:' : 'Paid to:'}
                  </div>
                  <h6 className="fw-bold text-dark mb-1">{selectedPaymentForView.partyName}</h6>
                  {selectedPaymentForView.partyPhone && (
                    <div className="small text-muted">Phone: {selectedPaymentForView.partyPhone}</div>
                  )}
                  {selectedPaymentForView.partyGstin && (
                    <div className="small text-muted">GSTIN: {selectedPaymentForView.partyGstin}</div>
                  )}
                </div>

                <div className="p-3 rounded-3 border text-center mb-3 bg-white">
                  <div className="small text-muted text-uppercase mb-1">Amount Transacted</div>
                  <div className="h3 fw-bold text-dark mb-0">
                    ₹{Number(selectedPaymentForView.amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="small text-muted mt-1">
                    Paid via <strong>{selectedPaymentForView.paymentMode}</strong>
                    {selectedPaymentForView.referenceNumber && (
                      <span> (Ref: {selectedPaymentForView.referenceNumber})</span>
                    )}
                  </div>
                </div>

                {selectedPaymentForView.linkedDocument && (
                  <div className="small mb-2">
                    <span className="text-muted">Against Document:</span> <strong>{selectedPaymentForView.linkedDocument}</strong>
                  </div>
                )}

                {selectedPaymentForView.narration && (
                  <div className="small text-muted fst-italic mb-3">
                    <strong>Narration:</strong> {selectedPaymentForView.narration}
                  </div>
                )}

                <div className="d-flex justify-content-between pt-4 mt-3 border-top small text-muted">
                  <div>Prepared By: ____________</div>
                  <div>Authorized Signatory: ____________</div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedPaymentForView(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-bold"
                  onClick={() => window.print()}
                >
                  🖨️ Print Voucher Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
