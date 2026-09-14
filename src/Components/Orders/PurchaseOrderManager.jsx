import { useState, useMemo, useDeferredValue } from 'react';

export default function PurchaseOrderManager({
  purchaseOrders = [],
  onSavePurchaseOrders,
  vendors = [],
  stockItems = [],
  company = {},
  onConvertToPurchaseBill,
  onNavigate,
  initialMode = 'list',
}) {
  const [activeTab, setActiveTab] = useState(initialMode === 'add' ? 'create' : 'register');
  const [editingPoId, setEditingPoId] = useState(null);
  const [selectedPoForView, setSelectedPoForView] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const deferredSearch = useDeferredValue(searchQuery);

  // Next PO number
  const nextPoNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = (purchaseOrders?.length || 0) + 1;
    return `PO-${year}-${String(count).padStart(4, '0')}`;
  }, [purchaseOrders]);

  // Form state
  const [formData, setFormData] = useState({
    poNumber: nextPoNumber,
    poDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    vendorName: '',
    vendorPhone: '',
    vendorAddress: '',
    vendorGstin: '',
    vendorState: '',
    deliveryLocation: company.address || '',
    paymentTerms: 'Payment within 30 days of delivery',
    status: 'Issued',
    notes: 'Please supply goods as per agreed rates and quality specifications.',
    items: [
      {
        id: '1',
        description: '',
        hsn: '',
        qty: 1,
        unit: 'PCS',
        rate: 0,
        discount: 0,
        gstRate: 18,
      },
    ],
  });

  // Handle vendor selection
  const handleSelectVendor = (name) => {
    const v = vendors.find((vend) => vend.name === name);
    if (v) {
      setFormData((prev) => ({
        ...prev,
        vendorName: v.name,
        vendorPhone: v.phone || '',
        vendorAddress: v.address || '',
        vendorGstin: v.gstin || '',
        vendorState: v.state || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, vendorName: name }));
    }
  };

  // Line item actions
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: String(Date.now()),
          description: '',
          hsn: '',
          qty: 1,
          unit: 'PCS',
          rate: 0,
          discount: 0,
          gstRate: 18,
        },
      ],
    }));
  };

  const handleRemoveItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // Stock product lookup
        if (field === 'description') {
          const stock = stockItems.find((s) => s.name === value);
          if (stock) {
            updated.hsn = stock.hsn || updated.hsn;
            updated.rate = stock.purchasePrice || stock.price || updated.rate;
            updated.gstRate = stock.gstRate !== undefined ? stock.gstRate : updated.gstRate;
            updated.unit = stock.unit || updated.unit;
          }
        }
        return updated;
      }),
    }));
  };

  // Calculations
  const poCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    const isInterState =
      company?.state &&
      formData.vendorState &&
      company.state.trim().toLowerCase() !== formData.vendorState.trim().toLowerCase();

    (formData.items || []).forEach((item) => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discount = parseFloat(item.discount) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;

      const taxable = Math.max(0, qty * rate - discount);
      const tax = (taxable * gstRate) / 100;

      subtotal += taxable;
      totalTax += tax;
    });

    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;
    const roundOff = Math.round((Math.round(grandTotal) - grandTotal) * 100) / 100;
    const finalAmount = Math.round(grandTotal);

    return {
      subtotal,
      totalTax,
      cgst: isInterState ? 0 : totalTax / 2,
      sgst: isInterState ? 0 : totalTax / 2,
      igst: isInterState ? totalTax : 0,
      roundOff,
      finalAmount,
      isInterState,
    };
  }, [formData.items, company.state, formData.vendorState]);

  // Reset
  const resetForm = () => {
    setFormData({
      poNumber: nextPoNumber,
      poDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      vendorName: '',
      vendorPhone: '',
      vendorAddress: '',
      vendorGstin: '',
      vendorState: '',
      deliveryLocation: company.address || '',
      paymentTerms: 'Payment within 30 days of delivery',
      status: 'Issued',
      notes: 'Please supply goods as per agreed rates and quality specifications.',
      items: [
        {
          id: String(Date.now()),
          description: '',
          hsn: '',
          qty: 1,
          unit: 'PCS',
          rate: 0,
          discount: 0,
          gstRate: 18,
        },
      ],
    });
    setEditingPoId(null);
  };

  // Save
  const handleSavePo = (e) => {
    e.preventDefault();
    if (!formData.vendorName) {
      alert('Please enter or select a vendor / supplier.');
      return;
    }
    if (formData.items.length === 0 || !formData.items[0].description) {
      alert('Please enter at least one item with a description.');
      return;
    }

    const newPo = {
      ...formData,
      id: editingPoId || `po_${Date.now()}`,
      subtotal: poCalculations.subtotal,
      totalTax: poCalculations.totalTax,
      cgst: poCalculations.cgst,
      sgst: poCalculations.sgst,
      igst: poCalculations.igst,
      grandTotal: poCalculations.finalAmount,
      updatedAt: new Date().toISOString(),
    };

    let updated;
    if (editingPoId) {
      updated = purchaseOrders.map((p) => (p.id === editingPoId ? newPo : p));
    } else {
      updated = [newPo, ...purchaseOrders];
    }

    onSavePurchaseOrders(updated);
    alert(editingPoId ? '✓ Purchase Order updated!' : '✓ Purchase Order issued successfully!');
    resetForm();
    setActiveTab('register');
  };

  // Edit PO
  const handleEditPo = (po) => {
    setFormData({
      poNumber: po.poNumber,
      poDate: po.poDate,
      expectedDeliveryDate: po.expectedDeliveryDate || '',
      vendorName: po.vendorName,
      vendorPhone: po.vendorPhone || '',
      vendorAddress: po.vendorAddress || '',
      vendorGstin: po.vendorGstin || '',
      vendorState: po.vendorState || '',
      deliveryLocation: po.deliveryLocation || '',
      paymentTerms: po.paymentTerms || '',
      status: po.status || 'Issued',
      notes: po.notes || '',
      items: po.items || [],
    });
    setEditingPoId(po.id);
    setActiveTab('create');
  };

  // Delete PO
  const handleDeletePo = (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      const updated = purchaseOrders.filter((p) => p.id !== id);
      onSavePurchaseOrders(updated);
    }
  };

  // Convert to Purchase Bill
  const handleConvertAction = (po) => {
    if (onConvertToPurchaseBill) {
      onConvertToPurchaseBill(po);
    } else {
      alert('Convert to Purchase Bill');
    }
  };

  // Filtered List
  const filteredOrders = useMemo(() => {
    return (purchaseOrders || []).filter((p) => {
      const q = deferredSearch.toLowerCase();
      const matchSearch =
        !q ||
        p.poNumber?.toLowerCase().includes(q) ||
        p.vendorName?.toLowerCase().includes(q) ||
        p.poDate?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, deferredSearch, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    let totalCommitted = 0;
    let openCount = 0;
    let receivedCount = 0;

    (purchaseOrders || []).forEach((p) => {
      const val = parseFloat(p.grandTotal) || 0;
      totalCommitted += val;
      if (p.status === 'Issued') openCount++;
      if (p.status === 'Received / Fulfilled') receivedCount++;
    });

    return {
      totalCount: purchaseOrders?.length || 0,
      totalCommitted,
      openCount,
      receivedCount,
    };
  }, [purchaseOrders]);

  return (
    <div className="container-fluid py-3 px-3 px-md-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-inline-flex align-items-center gap-2 px-2 py-1 mb-1 rounded bg-info bg-opacity-10 text-primary small fw-bold">
            <span>📑 TRANSACTIONS</span>
            <span>/</span>
            <span>PURCHASE ORDER</span>
          </div>
          <h1 className="h4 fw-bold mb-0 text-dark">Purchase Order (PO) Management</h1>
          <p className="text-muted small mb-0">
            Issue procurement orders to suppliers, track shipments, and convert directly to stock purchase bills.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm px-3 fw-bold ${
              activeTab === 'register' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
            }`}
            onClick={() => setActiveTab('register')}
          >
            📑 Purchase Order Register ({purchaseOrders?.length || 0})
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
            ＋ New Purchase Order
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-primary">
            <div className="text-muted small fw-semibold text-uppercase">Total POs Issued</div>
            <div className="h4 fw-bold text-dark mb-0 mt-1">{metrics.totalCount}</div>
            <div className="small text-muted mt-1">₹{metrics.totalCommitted.toLocaleString('en-IN')} total ordered</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-warning">
            <div className="text-muted small fw-semibold text-uppercase">Open / Pending Delivery</div>
            <div className="h4 fw-bold text-warning mb-0 mt-1">{metrics.openCount}</div>
            <div className="small text-muted mt-1">Awaiting vendor fulfillment</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-success">
            <div className="text-muted small fw-semibold text-uppercase">Fulfilled / Received</div>
            <div className="h4 fw-bold text-success mb-0 mt-1">{metrics.receivedCount}</div>
            <div className="small text-muted mt-1">Stock received &amp; billed</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-info">
            <div className="text-muted small fw-semibold text-uppercase">Supplier Network</div>
            <div className="h4 fw-bold text-info mb-0 mt-1">{vendors.length}</div>
            <div className="small text-muted mt-1">Active vendor partners</div>
          </div>
        </div>
      </div>

      {/* ================= REGISTER VIEW ================= */}
      {activeTab === 'register' && (
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
          <div className="p-3 bg-light border-bottom d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-center">
            <div className="position-relative flex-grow-1" style={{ maxWidth: '420px' }}>
              <input
                type="text"
                className="form-control form-control-sm ps-4"
                placeholder="🔍 Search POs by #, supplier name, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold">Status:</span>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Received / Fulfilled">Received / Fulfilled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-muted text-uppercase">
                <tr>
                  <th style={{ width: '130px' }}>PO #</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th>Vendor / Supplier</th>
                  <th className="text-center" style={{ width: '90px' }}>Items</th>
                  <th className="text-end" style={{ width: '140px' }}>Amount (₹)</th>
                  <th className="text-center" style={{ width: '150px' }}>Status</th>
                  <th className="text-end" style={{ width: '220px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="fs-1 mb-2">📑</div>
                      <h6 className="fw-bold mb-1">No purchase orders found</h6>
                      <p className="small text-muted mb-3">
                        {searchQuery ? 'No PO matches your search criteria.' : 'Create your first purchase order to suppliers.'}
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm px-3 fw-bold"
                        onClick={() => {
                          resetForm();
                          setActiveTab('create');
                        }}
                      >
                        ＋ Issue Purchase Order
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po) => {
                    const isFulfilled = po.status === 'Received / Fulfilled';
                    const isCancelled = po.status === 'Cancelled';
                    return (
                      <tr key={po.id}>
                        <td className="fw-bold text-primary">{po.poNumber}</td>
                        <td className="small text-muted">{po.poDate}</td>
                        <td>
                          <div className="fw-semibold text-dark">{po.vendorName}</div>
                          {po.vendorGstin && (
                            <div className="small text-muted">GSTIN: {po.vendorGstin}</div>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border">
                            {po.items?.length || 0} items
                          </span>
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹{(po.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge ${
                              po.status === 'Issued'
                                ? 'bg-primary'
                                : po.status === 'Received / Fulfilled'
                                ? 'bg-success'
                                : po.status === 'Cancelled'
                                ? 'bg-danger'
                                : 'bg-secondary'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            {!isFulfilled && !isCancelled && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success py-1 px-2 fw-semibold"
                                title="Inward items and convert to Purchase Bill"
                                onClick={() => handleConvertAction(po)}
                              >
                                📥 Inward Bill
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-1 px-2"
                              title="View / Print PO"
                              onClick={() => setSelectedPoForView(po)}
                            >
                              👁️ View
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary py-1 px-2"
                              title="Edit PO"
                              onClick={() => handleEditPo(po)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              title="Delete PO"
                              onClick={() => handleDeletePo(po.id)}
                            >
                              🗑️
                            </button>
                          </div>
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
        <form onSubmit={handleSavePo}>
          <div className="card border-0 shadow-sm rounded-3 bg-white p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <h2 className="h5 fw-bold text-dark mb-0">
                {editingPoId ? '✏️ Modify Purchase Order' : '＋ Issue New Purchase Order'}
              </h2>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setActiveTab('register')}
              >
                ← Back to Register
              </button>
            </div>

            {/* Header Details */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">PO Number *</label>
                <input
                  type="text"
                  className="form-control form-control-sm fw-bold"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">PO Date *</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.poDate}
                  onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Received / Fulfilled">Received / Fulfilled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Vendor Box */}
            <div className="p-3 rounded-3 bg-light border mb-4">
              <h3 className="h6 fw-bold text-primary mb-3">🏢 Supplier / Vendor Details</h3>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Vendor Name *</label>
                  <input
                    type="text"
                    list="po-vendor-list"
                    className="form-control form-control-sm fw-semibold"
                    placeholder="Type or pick vendor..."
                    value={formData.vendorName}
                    onChange={(e) => handleSelectVendor(e.target.value)}
                    required
                  />
                  <datalist id="po-vendor-list">
                    {vendors.map((v) => (
                      <option key={v.id || v.name} value={v.name} />
                    ))}
                  </datalist>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Contact Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Phone / Mobile"
                    value={formData.vendorPhone}
                    onChange={(e) => setFormData({ ...formData, vendorPhone: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Supplier GSTIN</label>
                  <input
                    type="text"
                    className="form-control form-control-sm text-uppercase"
                    placeholder="15-digit GSTIN"
                    value={formData.vendorGstin}
                    onChange={(e) => setFormData({ ...formData, vendorGstin: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-8">
                  <label className="form-label small fw-semibold">Vendor Address</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Supplier Address"
                    value={formData.vendorAddress}
                    onChange={(e) => setFormData({ ...formData, vendorAddress: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Supplier State</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="State"
                    value={formData.vendorState}
                    onChange={(e) => setFormData({ ...formData, vendorState: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 fw-bold text-primary mb-0">📦 Items to Procure</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary fw-bold"
                  onClick={handleAddItem}
                >
                  ＋ Add Item Row
                </button>
              </div>

              <div className="table-responsive border rounded-3">
                <table className="table table-bordered align-middle mb-0">
                  <thead className="table-light small text-muted text-uppercase">
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Item Description *</th>
                      <th style={{ width: '100px' }}>HSN</th>
                      <th style={{ width: '90px' }}>Qty</th>
                      <th style={{ width: '90px' }}>Unit</th>
                      <th style={{ width: '120px' }}>Purchase Rate (₹)</th>
                      <th style={{ width: '100px' }}>GST %</th>
                      <th style={{ width: '130px' }} className="text-end">Total (₹)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const qty = parseFloat(item.qty) || 0;
                      const rate = parseFloat(item.rate) || 0;
                      const gst = parseFloat(item.gstRate) || 0;
                      const lineTot = qty * rate + (qty * rate * gst) / 100;

                      return (
                        <tr key={item.id}>
                          <td className="text-center small text-muted">{index + 1}</td>
                          <td>
                            <input
                              type="text"
                              list={`po-stock-list-${item.id}`}
                              className="form-control form-control-sm fw-semibold"
                              placeholder="Type item or select..."
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              required
                            />
                            <datalist id={`po-stock-list-${item.id}`}>
                              {stockItems.map((s) => (
                                <option key={s.id || s.name} value={s.name} />
                              ))}
                            </datalist>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.hsn}
                              onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-control form-control-sm text-end"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.unit}
                              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                            >
                              <option value="PCS">PCS</option>
                              <option value="NOS">NOS</option>
                              <option value="KGS">KGS</option>
                              <option value="BOX">BOX</option>
                              <option value="MTR">MTR</option>
                              <option value="SET">SET</option>
                              <option value="LTR">LTR</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-control form-control-sm text-end"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.gstRate}
                              onChange={(e) => handleItemChange(item.id, 'gstRate', e.target.value)}
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>
                          <td className="text-end fw-bold text-dark">
                            ₹{lineTot.toFixed(2)}
                          </td>
                          <td className="text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Summary */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Delivery Location</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formData.deliveryLocation}
                    onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Payment &amp; Delivery Terms</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label small fw-bold">Procurement Notes</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card bg-light border p-3">
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Taxable Amount:</span>
                    <span className="fw-semibold">₹{poCalculations.subtotal.toFixed(2)}</span>
                  </div>
                  {poCalculations.isInterState ? (
                    <div className="d-flex justify-content-between mb-2 small text-muted">
                      <span>IGST:</span>
                      <span>₹{poCalculations.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>CGST:</span>
                        <span>₹{poCalculations.cgst.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 small text-muted">
                        <span>SGST:</span>
                        <span>₹{poCalculations.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="d-flex justify-content-between mb-2 small text-muted">
                    <span>Round Off:</span>
                    <span>₹{poCalculations.roundOff.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top h5 fw-bold text-dark mb-0">
                    <span>Total Purchase Commitment:</span>
                    <span className="text-primary">₹{poCalculations.finalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 border-top pt-3">
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
              <button type="submit" className="btn btn-primary px-5 fw-bold">
                {editingPoId ? '💾 Update PO' : '💾 Issue Purchase Order'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================= VIEW / PRINT MODAL ================= */}
      {selectedPoForView && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white py-3">
                <h5 className="modal-title fw-bold">
                  📑 Purchase Order #{selectedPoForView.poNumber}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedPoForView(null)}
                />
              </div>
              <div className="modal-body p-4" id="printable-purchase-order">
                <div className="d-flex justify-content-between border-bottom pb-3 mb-3">
                  <div>
                    <h4 className="fw-bold mb-1 text-primary">{company.name || 'TREAD ENTERPRISE'}</h4>
                    <div className="small text-muted">{company.address || 'Business Hub, Industrial Area'}</div>
                    <div className="small text-muted">GSTIN: {company.gstin || 'Not specified'} | State: {company.state || 'N/A'}</div>
                  </div>
                  <div className="text-end">
                    <div className="badge bg-info text-dark fs-6 px-3 py-2 mb-2">PURCHASE ORDER</div>
                    <div className="fw-bold">PO #: {selectedPoForView.poNumber}</div>
                    <div className="small text-muted">Date: {selectedPoForView.poDate}</div>
                    {selectedPoForView.expectedDeliveryDate && (
                      <div className="small text-muted">Exp. Delivery: {selectedPoForView.expectedDeliveryDate}</div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 mb-3">
                  <div className="small text-muted fw-bold text-uppercase mb-1">To Vendor / Supplier</div>
                  <div className="h6 fw-bold text-dark mb-1">{selectedPoForView.vendorName}</div>
                  <div className="small text-muted">{selectedPoForView.vendorAddress || 'Vendor address on file'}</div>
                  {selectedPoForView.vendorGstin && (
                    <div className="small text-muted">GSTIN: {selectedPoForView.vendorGstin}</div>
                  )}
                </div>

                <table className="table table-bordered table-sm mb-3">
                  <thead className="table-light small text-uppercase">
                    <tr>
                      <th>#</th>
                      <th>Item Description</th>
                      <th>HSN</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Rate</th>
                      <th className="text-center">GST</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPoForView.items?.map((it, idx) => {
                      const q = parseFloat(it.qty) || 0;
                      const r = parseFloat(it.rate) || 0;
                      const gst = parseFloat(it.gstRate) || 0;
                      const tot = q * r + (q * r * gst) / 100;
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold">{it.description}</td>
                          <td>{it.hsn || '-'}</td>
                          <td className="text-center">{q} {it.unit || 'PCS'}</td>
                          <td className="text-end">₹{r.toFixed(2)}</td>
                          <td className="text-center">{gst}%</td>
                          <td className="text-end fw-bold">₹{tot.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="d-flex justify-content-between p-3 bg-dark text-white rounded-3 mb-3">
                  <span className="fw-bold">Total Purchase Order Value:</span>
                  <span className="fw-bold fs-5 text-warning">
                    ₹{(selectedPoForView.grandTotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedPoForView(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-success fw-bold"
                  onClick={() => {
                    handleConvertAction(selectedPoForView);
                    setSelectedPoForView(null);
                  }}
                >
                  📥 Inward Purchase Bill
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-bold"
                  onClick={() => window.print()}
                >
                  🖨️ Print PO Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
