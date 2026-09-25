import { useState, useMemo, useDeferredValue } from 'react';
import ActionFolder from '../Common/ActionFolder.jsx';

export default function SalesOrderManager({
  orders = [],
  onSaveOrders,
  customers = [],
  stockItems = [],
  company = {},
  onConvertToInvoice,
  onNavigate,
  initialMode = 'list',
}) {
  const [activeTab, setActiveTab] = useState(initialMode === 'add' ? 'create' : 'register');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [selectedOrderForView, setSelectedOrderForView] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const deferredSearch = useDeferredValue(searchQuery);

  // Generate next SO number
  const nextOrderNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = (orders?.length || 0) + 1;
    return `SO-${year}-${String(count).padStart(4, '0')}`;
  }, [orders]);

  // Form State
  const [formData, setFormData] = useState({
    orderNumber: nextOrderNumber,
    orderDate: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerGstin: '',
    customerState: '',
    orderStatus: 'Confirmed',
    notes: 'Thank you for your order. Goods will be dispatched as per schedule.',
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

  // Handle Customer Selection
  const handleSelectCustomer = (name) => {
    const cust = customers.find((c) => c.name === name);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerName: cust.name,
        customerPhone: cust.phone || '',
        customerAddress: cust.address || '',
        customerGstin: cust.gstin || '',
        customerState: cust.state || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, customerName: name }));
    }
  };

  // Line item handlers
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

        // If product chosen from stock, auto-populate details
        if (field === 'description') {
          const stock = stockItems.find((s) => s.name === value);
          if (stock) {
            updated.hsn = stock.hsn || updated.hsn;
            updated.rate = stock.sellingPrice || stock.price || updated.rate;
            updated.gstRate = stock.gstRate !== undefined ? stock.gstRate : updated.gstRate;
            updated.unit = stock.unit || updated.unit;
          }
        }
        return updated;
      }),
    }));
  };

  // Live order calculations
  const orderCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    const isInterState =
      company?.state &&
      formData.customerState &&
      company.state.trim().toLowerCase() !== formData.customerState.trim().toLowerCase();

    const itemsComputed = (formData.items || []).map((item) => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discount = parseFloat(item.discount) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;

      const base = qty * rate;
      const taxable = Math.max(0, base - discount);
      const tax = (taxable * gstRate) / 100;
      const lineTotal = taxable + tax;

      subtotal += taxable;
      totalTax += tax;

      return {
        ...item,
        taxable,
        tax,
        lineTotal,
      };
    });

    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;
    const roundOff = Math.round((Math.round(grandTotal) - grandTotal) * 100) / 100;
    const finalAmount = Math.round(grandTotal);

    return {
      itemsComputed,
      subtotal,
      totalTax,
      cgst: isInterState ? 0 : totalTax / 2,
      sgst: isInterState ? 0 : totalTax / 2,
      igst: isInterState ? totalTax : 0,
      roundOff,
      finalAmount,
      isInterState,
    };
  }, [formData.items, company.state, formData.customerState]);

  // Reset form
  const resetForm = () => {
    setFormData({
      orderNumber: nextOrderNumber,
      orderDate: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerGstin: '',
      customerState: '',
      orderStatus: 'Confirmed',
      notes: 'Thank you for your order. Goods will be dispatched as per schedule.',
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
    setEditingOrderId(null);
  };

  // Save Order
  const handleSaveOrder = (e) => {
    e.preventDefault();
    if (!formData.customerName) {
      alert('Please enter or select a customer name.');
      return;
    }
    if (formData.items.length === 0 || !formData.items[0].description) {
      alert('Please enter at least one line item with a description.');
      return;
    }

    const newOrder = {
      ...formData,
      id: editingOrderId || `so_${Date.now()}`,
      subtotal: orderCalculations.subtotal,
      totalTax: orderCalculations.totalTax,
      cgst: orderCalculations.cgst,
      sgst: orderCalculations.sgst,
      igst: orderCalculations.igst,
      grandTotal: orderCalculations.finalAmount,
      updatedAt: new Date().toISOString(),
    };

    let updated;
    if (editingOrderId) {
      updated = orders.map((o) => (o.id === editingOrderId ? newOrder : o));
    } else {
      updated = [newOrder, ...orders];
    }

    onSaveOrders(updated);
    alert(editingOrderId ? '✓ Sales Order updated successfully!' : '✓ Sales Order created successfully!');
    resetForm();
    setActiveTab('register');
  };

  // Edit existing order
  const handleEditOrder = (order) => {
    setFormData({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      validUntil: order.validUntil || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      customerGstin: order.customerGstin || '',
      customerState: order.customerState || '',
      orderStatus: order.orderStatus || 'Confirmed',
      notes: order.notes || '',
      items: order.items || [],
    });
    setEditingOrderId(order.id);
    setActiveTab('create');
  };

  // Delete order
  const handleDeleteOrder = (id) => {
    if (window.confirm('Are you sure you want to delete this sales order?')) {
      const updated = orders.filter((o) => o.id !== id);
      onSaveOrders(updated);
    }
  };

  // Filtered orders for Register
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const q = deferredSearch.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.orderDate?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, deferredSearch, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalValue = 0;
    let confirmedValue = 0;
    let convertedCount = 0;

    (orders || []).forEach((o) => {
      const val = parseFloat(o.grandTotal) || 0;
      totalValue += val;
      if (o.orderStatus === 'Confirmed') confirmedValue += val;
      if (o.orderStatus === 'Converted to Invoice') convertedCount++;
    });

    return {
      totalCount: orders?.length || 0,
      totalValue,
      confirmedValue,
      convertedCount,
    };
  }, [orders]);

  // Convert SO to Invoice
  const handleConvertAction = (order) => {
    if (onConvertToInvoice) {
      onConvertToInvoice(order);
    } else {
      alert('Ready to convert to invoice.');
    }
  };

  return (
    <div className="container-fluid py-3 px-3 px-md-4">
      {/* Top Header Strip */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-inline-flex align-items-center gap-2 px-2 py-1 mb-1 rounded bg-primary bg-opacity-10 text-primary small fw-bold">
            <span>📋 TRANSACTIONS</span>
            <span>/</span>
            <span>SALES ORDER</span>
          </div>
          <h1 className="h4 fw-bold mb-0 text-dark">Sales Order Management</h1>
          <p className="text-muted small mb-0">
            Create, track, and convert client quotation orders directly into GST tax invoices.
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
            📋 Sales Order Register ({orders?.length || 0})
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
            ＋ New Sales Order
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-primary">
            <div className="text-muted small fw-semibold text-uppercase">Total Orders</div>
            <div className="h4 fw-bold text-dark mb-0 mt-1">{metrics.totalCount}</div>
            <div className="small text-muted mt-1">₹{metrics.totalValue.toLocaleString('en-IN')} total booked</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-success">
            <div className="text-muted small fw-semibold text-uppercase">Confirmed Value</div>
            <div className="h4 fw-bold text-success mb-0 mt-1">
              ₹{metrics.confirmedValue.toLocaleString('en-IN')}
            </div>
            <div className="small text-muted mt-1">Ready for fulfillment</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-info">
            <div className="text-muted small fw-semibold text-uppercase">Invoiced Orders</div>
            <div className="h4 fw-bold text-info mb-0 mt-1">{metrics.convertedCount}</div>
            <div className="small text-muted mt-1">Converted to GST bill</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-warning">
            <div className="text-muted small fw-semibold text-uppercase">Quick Action</div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-bold mt-1 w-100"
              onClick={() => {
                resetForm();
                setActiveTab('create');
              }}
            >
              ＋ Create Sales Order
            </button>
          </div>
        </div>
      </div>

      {/* ================= REGISTER VIEW ================= */}
      {activeTab === 'register' && (
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
          {/* Filter Bar */}
          <div className="p-3 bg-light border-bottom d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-center">
            <div className="position-relative flex-grow-1" style={{ maxWidth: '420px' }}>
              <input
                type="text"
                className="form-control form-control-sm ps-4"
                placeholder="🔍 Search orders by #, customer name, date..."
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
                <option value="Confirmed">Confirmed</option>
                <option value="Converted to Invoice">Converted to Invoice</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-muted text-uppercase">
                <tr>
                  <th style={{ width: '130px' }}>Order #</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th>Customer</th>
                  <th className="text-center" style={{ width: '90px' }}>Items</th>
                  <th className="text-end" style={{ width: '140px' }}>Amount (₹)</th>
                  <th className="text-center" style={{ width: '140px' }}>Status</th>
                  <th className="text-end" style={{ width: '220px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="fs-1 mb-2">📋</div>
                      <h6 className="fw-bold mb-1">No sales orders found</h6>
                      <p className="small text-muted mb-3">
                        {searchQuery ? 'Try adjusting your search or filters.' : 'Start by generating your first sales order.'}
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm px-3 fw-bold"
                        onClick={() => {
                          resetForm();
                          setActiveTab('create');
                        }}
                      >
                        ＋ Create Sales Order
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isConverted = order.orderStatus === 'Converted to Invoice';
                    const isCancelled = order.orderStatus === 'Cancelled';
                    return (
                      <tr key={order.id}>
                        <td className="fw-bold text-primary">{order.orderNumber}</td>
                        <td className="small text-muted">{order.orderDate}</td>
                        <td>
                          <div className="fw-semibold text-dark">{order.customerName}</div>
                          {order.customerPhone && (
                            <div className="small text-muted">📞 {order.customerPhone}</div>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border">
                            {order.items?.length || 0} items
                          </span>
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge ${
                              order.orderStatus === 'Confirmed'
                                ? 'bg-success'
                                : order.orderStatus === 'Converted to Invoice'
                                ? 'bg-info text-dark'
                                : order.orderStatus === 'Cancelled'
                                ? 'bg-danger'
                                : 'bg-secondary'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="text-end">
                          <ActionFolder
                            primaryAction={{
                              label: 'Preview',
                              icon: '👁️',
                              title: 'View & Print Order Slip',
                              onClick: () => setSelectedOrderForView(order),
                            }}
                            actions={[
                              !isConverted ? {
                                label: 'Convert to Invoice',
                                icon: '⚡',
                                variant: 'success',
                                onClick: () => handleConvertAction(order),
                              } : null,
                              {
                                label: 'Edit Order',
                                icon: '✏️',
                                onClick: () => handleEditOrder(order),
                              },
                              { divider: true },
                              {
                                label: 'Delete Order',
                                icon: '🗑️',
                                variant: 'danger',
                                onClick: () => handleDeleteOrder(order.id),
                              },
                            ].filter(Boolean)}
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
        <form onSubmit={handleSaveOrder}>
          <div className="card border-0 shadow-sm rounded-3 bg-white p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <h2 className="h5 fw-bold text-dark mb-0">
                {editingOrderId ? '✏️ Modify Sales Order' : '＋ Add New Sales Order'}
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
                <label className="form-label small fw-bold">Order Number *</label>
                <input
                  type="text"
                  className="form-control form-control-sm fw-bold"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Order Date *</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Valid Until / Due Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Order Status</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.orderStatus}
                  onChange={(e) => setFormData({ ...formData, orderStatus: e.target.value })}
                >
                  <option value="Draft">Draft</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Converted to Invoice">Converted to Invoice</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="p-3 rounded-3 bg-light border mb-4">
              <h3 className="h6 fw-bold text-primary mb-3">👤 Customer Information</h3>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Customer Name *</label>
                  <input
                    type="text"
                    list="so-customer-list"
                    className="form-control form-control-sm fw-semibold"
                    placeholder="Type or select customer..."
                    value={formData.customerName}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    required
                  />
                  <datalist id="so-customer-list">
                    {customers.map((c) => (
                      <option key={c.id || c.name} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Contact Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Mobile / Phone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">GSTIN</label>
                  <input
                    type="text"
                    className="form-control form-control-sm text-uppercase"
                    placeholder="15-digit GSTIN"
                    value={formData.customerGstin}
                    onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-8">
                  <label className="form-label small fw-semibold">Billing / Delivery Address</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Street, City, Pincode"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Place of Supply (State)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Maharashtra, Delhi"
                    value={formData.customerState}
                    onChange={(e) => setFormData({ ...formData, customerState: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 fw-bold text-primary mb-0">📦 Order Line Items</h3>
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
                      <th>Item Description / Stock Product *</th>
                      <th style={{ width: '100px' }}>HSN/SAC</th>
                      <th style={{ width: '90px' }}>Qty</th>
                      <th style={{ width: '90px' }}>Unit</th>
                      <th style={{ width: '120px' }}>Rate (₹)</th>
                      <th style={{ width: '100px' }}>Disc (₹)</th>
                      <th style={{ width: '100px' }}>GST %</th>
                      <th style={{ width: '130px' }} className="text-end">Total (₹)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const qty = parseFloat(item.qty) || 0;
                      const rate = parseFloat(item.rate) || 0;
                      const disc = parseFloat(item.discount) || 0;
                      const gst = parseFloat(item.gstRate) || 0;
                      const taxable = Math.max(0, qty * rate - disc);
                      const lineTot = taxable + (taxable * gst) / 100;

                      return (
                        <tr key={item.id}>
                          <td className="text-center small text-muted">{index + 1}</td>
                          <td>
                            <input
                              type="text"
                              list={`stock-items-list-${item.id}`}
                              className="form-control form-control-sm fw-semibold"
                              placeholder="Type or pick stock item..."
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              required
                            />
                            <datalist id={`stock-items-list-${item.id}`}>
                              {stockItems.map((s) => (
                                <option key={s.id || s.name} value={s.name} />
                              ))}
                            </datalist>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="HSN"
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
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-control form-control-sm text-end"
                              value={item.discount}
                              onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
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

            {/* Calculations & Notes */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold">Order Notes &amp; Terms</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="4"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Terms of delivery, payment conditions, notes..."
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="card bg-light border p-3">
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Taxable Subtotal:</span>
                    <span className="fw-semibold">₹{orderCalculations.subtotal.toFixed(2)}</span>
                  </div>
                  {orderCalculations.isInterState ? (
                    <div className="d-flex justify-content-between mb-2 small text-muted">
                      <span>IGST:</span>
                      <span>₹{orderCalculations.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>CGST:</span>
                        <span>₹{orderCalculations.cgst.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 small text-muted">
                        <span>SGST:</span>
                        <span>₹{orderCalculations.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="d-flex justify-content-between mb-2 small text-muted">
                    <span>Round Off:</span>
                    <span>₹{orderCalculations.roundOff.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top h5 fw-bold text-dark mb-0">
                    <span>Grand Total:</span>
                    <span className="text-primary">₹{orderCalculations.finalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="d-flex justify-content-end gap-2 border-top pt-3">
              <button
                type="button"
                className="btn btn-outline-primary px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
                onClick={() => {
                  setSelectedOrderForView({
                    ...formData,
                    orderNumber: formData.orderNumber || 'SO-PREVIEW',
                    subtotal: orderCalculations.subtotal,
                    totalTax: orderCalculations.totalTax,
                    cgst: orderCalculations.cgst,
                    sgst: orderCalculations.sgst,
                    igst: orderCalculations.igst,
                    grandTotal: orderCalculations.finalAmount,
                  });
                }}
              >
                <span>👁️</span>
                <span>Preview Order Slip</span>
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
              <button type="submit" className="btn btn-primary px-5 fw-bold">
                {editingOrderId ? '💾 Update Sales Order' : '💾 Save Sales Order'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================= VIEW / PRINT MODAL ================= */}
      {selectedOrderForView && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white py-3">
                <h5 className="modal-title fw-bold">
                  📋 Sales Order #{selectedOrderForView.orderNumber}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedOrderForView(null)}
                />
              </div>
              <div className="modal-body p-4" id="printable-sales-order">
                {/* Header with Company details */}
                <div className="d-flex justify-content-between border-bottom pb-3 mb-3">
                  <div>
                    <h4 className="fw-bold mb-1 text-primary">{company.name || 'TREAD ENTERPRISE'}</h4>
                    <div className="small text-muted">{company.address || 'Business Hub, Industrial Area'}</div>
                    <div className="small text-muted">GSTIN: {company.gstin || 'Not specified'} | State: {company.state || 'N/A'}</div>
                    <div className="small text-muted">Phone: {company.phone || 'N/A'}</div>
                  </div>
                  <div className="text-end">
                    <div className="badge bg-primary fs-6 px-3 py-2 mb-2">SALES ORDER</div>
                    <div className="fw-bold">SO #: {selectedOrderForView.orderNumber}</div>
                    <div className="small text-muted">Date: {selectedOrderForView.orderDate}</div>
                    {selectedOrderForView.validUntil && (
                      <div className="small text-muted">Valid Until: {selectedOrderForView.validUntil}</div>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-3 bg-light rounded-3 mb-3">
                  <div className="small text-muted fw-bold text-uppercase mb-1">Customer / Buyer</div>
                  <div className="h6 fw-bold text-dark mb-1">{selectedOrderForView.customerName}</div>
                  <div className="small text-muted">{selectedOrderForView.customerAddress || 'Address on file'}</div>
                  {selectedOrderForView.customerGstin && (
                    <div className="small text-muted">GSTIN: {selectedOrderForView.customerGstin}</div>
                  )}
                  {selectedOrderForView.customerPhone && (
                    <div className="small text-muted">Phone: {selectedOrderForView.customerPhone}</div>
                  )}
                </div>

                {/* Item Table */}
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
                    {selectedOrderForView.items?.map((it, idx) => {
                      const q = parseFloat(it.qty) || 0;
                      const r = parseFloat(it.rate) || 0;
                      const disc = parseFloat(it.discount) || 0;
                      const gst = parseFloat(it.gstRate) || 0;
                      const taxable = Math.max(0, q * r - disc);
                      const tot = taxable + (taxable * gst) / 100;
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

                {/* Grand Total Bar */}
                <div className="d-flex justify-content-between p-3 bg-dark text-white rounded-3 mb-3">
                  <span className="fw-bold">Total Payable / Order Value:</span>
                  <span className="fw-bold fs-5 text-warning">
                    ₹{(selectedOrderForView.grandTotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {selectedOrderForView.notes && (
                  <div className="small text-muted fst-italic mb-3">
                    <strong>Note:</strong> {selectedOrderForView.notes}
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedOrderForView(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-success fw-bold"
                  onClick={() => {
                    handleConvertAction(selectedOrderForView);
                    setSelectedOrderForView(null);
                  }}
                >
                  ⚡ Convert to Invoice
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-bold"
                  onClick={() => window.print()}
                >
                  🖨️ Print Order Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
