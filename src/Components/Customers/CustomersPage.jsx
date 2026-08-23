import { useState, useMemo, useDeferredValue } from 'react';
import { v4 as uuidv4 } from 'uuid';

const EMPTY_FORM = {
  name: '',
  type: 'Customer', // 'Customer' (Sales) | 'Vendor' (Purchase) | 'Both'
  phone: '',
  email: '',
  address: '',
  gstin: '',
  notes: '',
};

function CustomersPage({ customers = [], onSave, onDelete, onLoadToInvoice, onBack }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM_OR_FORM());
  const [search, setSearch] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState('all'); // 'all' | 'Customer' | 'Vendor'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const deferredSearch = useDeferredValue(search);

  function EMPTY_ITEM_OR_FORM() {
    return { ...EMPTY_FORM };
  }

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
      {/* Header & Main Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">👥 Customers & Vendors Directory</h1>
          <p className="text-muted mb-0">
            Save buyer and supplier accounts for fast invoice billing (Sales) and inventory stocking (Purchase).
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
            className="btn btn-outline-success btn-sm fw-semibold"
            onClick={exportPartiesCSV}
            disabled={customers.length === 0}
          >
            📤 Export Directory CSV
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={() => openCreate('Vendor')}
          >
            ＋ Add Vendor (Purchase)
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm fw-bold shadow-sm"
            onClick={() => openCreate('Customer')}
          >
            ＋ Add Customer (Sales)
          </button>
        </div>
      </div>

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
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
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
                            <code className="small">{customer.gstin}</code>
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
                    <label className="form-label fw-semibold">GSTIN Number (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 09AAAAA0000A1Z5"
                      value={form.gstin}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))
                      }
                      maxLength={15}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Billing / Office Address</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Street, City, State, PIN"
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
