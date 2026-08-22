import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import PurchaseBillEntry from './PurchaseBillEntry.jsx';
import PurchaseImportFile from './PurchaseImportFile.jsx';
import PurchaseBillsList from './PurchaseBillsList.jsx';

const EMPTY_STOCK_ITEM = {
  name: '',
  hsn: '',
  stock: 10,
  rate: 0,
  gst: 18,
  unit: 'PCS',
};

function StockManagement({
  stockItems = [],
  onSaveStock,
  vendors = [],
  purchaseBills = [],
  onSavePurchaseBills,
  onSaveVendor,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'manual-bill' | 'import-file' | 'purchase-history'
  const [items, setItems] = useState(stockItems);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStockId, setEditingStockId] = useState(null);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_ITEM);

  const updateStock = (newItems) => {
    setItems(newItems);
    if (onSaveStock) onSaveStock(newItems);
  };

  // Metrics
  const totalStockUnits = items.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
  const totalValuation = items.reduce(
    (sum, item) => sum + (Number(item.stock) || 0) * (Number(item.rate) || 0),
    0
  );
  const lowStockCount = items.filter((item) => Number(item.stock) <= 5).length;
  const totalPurchasesAmount = (purchaseBills || []).reduce(
    (sum, bill) => sum + (Number(bill.totals?.grandTotal || bill.totalAmount) || 0),
    0
  );

  // Filtered Stock
  const filteredStock = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.hsn && item.hsn.toLowerCase().includes(search.toLowerCase()));
    const matchesLow = filterLowStock ? Number(item.stock) <= 5 : true;
    return matchesSearch && matchesLow;
  });

  // Handler for Saving a Purchase Bill (Manual Entry)
  const handleSavePurchaseBill = (billData) => {
    const newBill = {
      id: uuidv4(),
      ...billData,
      createdAt: new Date().toISOString(),
    };

    // Inward stock: update existing item quantities or add new items
    let updatedCatalog = [...items];
    billData.items.forEach((row) => {
      const matchIndex = updatedCatalog.findIndex(
        (it) => it.name.trim().toLowerCase() === row.description.trim().toLowerCase()
      );
      const inwardQty = Number(row.quantity) || 1;
      const rate = Number(row.rate) || 0;
      const gst = Number(row.gstPercent) || 18;

      if (matchIndex >= 0) {
        updatedCatalog[matchIndex] = {
          ...updatedCatalog[matchIndex],
          stock: (Number(updatedCatalog[matchIndex].stock) || 0) + inwardQty,
          rate: rate > 0 ? rate : updatedCatalog[matchIndex].rate,
          hsn: row.hsn.trim() || updatedCatalog[matchIndex].hsn,
          gst: gst,
          unit: row.unit || updatedCatalog[matchIndex].unit || 'PCS',
        };
      } else {
        updatedCatalog.unshift({
          id: uuidv4(),
          name: row.description.trim(),
          hsn: row.hsn.trim(),
          stock: inwardQty,
          rate: rate,
          gst: gst,
          unit: row.unit || 'PCS',
          createdAt: new Date().toISOString(),
        });
      }
    });

    updateStock(updatedCatalog);
    if (onSavePurchaseBills) {
      onSavePurchaseBills([newBill, ...(purchaseBills || [])]);
    }

    if (
      onSaveVendor &&
      billData.vendorName &&
      !vendors.some((v) => v.name.toLowerCase() === billData.vendorName.trim().toLowerCase())
    ) {
      onSaveVendor({
        name: billData.vendorName.trim(),
        gstin: billData.vendorGstin || '',
        address: billData.vendorAddress || '',
        type: 'Vendor',
      });
    }

    alert(
      `✓ Purchase Bill ${billData.billNumber} recorded successfully!\n✓ Stock inventory increased by ${billData.items.length} item(s).`
    );
    setActiveTab('inventory');
  };

  // Handler for Confirming Import from Excel / CSV File
  const handleConfirmFileImport = (importData) => {
    let subtotal = 0;
    let totalTax = 0;
    const billItems = importData.items.map((row) => {
      const qty = Number(row.quantity) || 1;
      const rate = Number(row.rate) || 0;
      const gst = Number(row.gstPercent) || 18;
      const amt = qty * rate;
      const tax = (amt * gst) / 100;
      subtotal += amt;
      totalTax += tax;
      return {
        description: row.description,
        hsn: row.hsn || '',
        quantity: qty,
        rate: rate,
        gstPercent: gst,
        unit: row.unit || 'PCS',
        amount: amt,
        tax: tax,
        total: amt + tax,
      };
    });

    const newBill = {
      id: uuidv4(),
      billNumber: importData.billNumber,
      billDate: importData.billDate,
      vendorName: importData.vendorName,
      vendorGstin: '',
      vendorAddress: '',
      items: billItems,
      totals: { subtotal, totalTax, grandTotal: subtotal + totalTax },
      notes: 'Imported from Purchase Bill Spreadsheet',
      createdAt: new Date().toISOString(),
    };

    let updatedCatalog = [...items];
    importData.items.forEach((row) => {
      const matchIndex = updatedCatalog.findIndex(
        (it) => it.name.trim().toLowerCase() === row.description.trim().toLowerCase()
      );
      const qty = Number(row.quantity) || 1;
      if (matchIndex >= 0) {
        updatedCatalog[matchIndex] = {
          ...updatedCatalog[matchIndex],
          stock: (Number(updatedCatalog[matchIndex].stock) || 0) + qty,
          rate: Number(row.rate) > 0 ? Number(row.rate) : updatedCatalog[matchIndex].rate,
          hsn: row.hsn || updatedCatalog[matchIndex].hsn,
          gst: row.gstPercent || updatedCatalog[matchIndex].gst,
          unit: row.unit || updatedCatalog[matchIndex].unit || 'PCS',
        };
      } else {
        updatedCatalog.unshift({
          id: uuidv4(),
          name: row.description,
          hsn: row.hsn || '',
          stock: qty,
          rate: Number(row.rate) || 0,
          gst: Number(row.gstPercent) || 18,
          unit: row.unit || 'PCS',
          createdAt: new Date().toISOString(),
        });
      }
    });

    updateStock(updatedCatalog);
    if (onSavePurchaseBills) {
      onSavePurchaseBills([newBill, ...(purchaseBills || [])]);
    }

    alert(
      `✓ Successfully imported ${importData.items.length} items from purchase file!\n✓ Stock inventory updated.`
    );
    setActiveTab('inventory');
  };

  // Export stock to CSV
  const exportStockCSV = () => {
    const rows = [
      [
        'Item Name',
        'HSN Code',
        'Available Stock',
        'Unit Rate (INR)',
        'GST Slab (%)',
        'Unit',
        'Total Valuation (INR)',
      ],
    ];
    items.forEach((item) => {
      const val = (Number(item.stock) || 0) * (Number(item.rate) || 0);
      rows.push([
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.hsn || ''}"`,
        item.stock,
        item.rate,
        item.gst,
        item.unit || 'PCS',
        val.toFixed(2),
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Manual stock single add/edit
  const handleSaveStockItem = (e) => {
    e.preventDefault();
    if (!stockForm.name.trim()) {
      alert('Please enter an item name.');
      return;
    }

    if (editingStockId) {
      const updated = items.map((i) =>
        i.id === editingStockId
          ? {
              ...i,
              name: stockForm.name.trim(),
              hsn: stockForm.hsn.trim(),
              stock: Math.max(0, Number(stockForm.stock) || 0),
              rate: Math.max(0, Number(stockForm.rate) || 0),
              gst: Number(stockForm.gst) || 18,
              unit: stockForm.unit || 'PCS',
            }
          : i
      );
      updateStock(updated);
    } else {
      const newItem = {
        id: uuidv4(),
        name: stockForm.name.trim(),
        hsn: stockForm.hsn.trim(),
        stock: Math.max(0, Number(stockForm.stock) || 0),
        rate: Math.max(0, Number(stockForm.rate) || 0),
        gst: Number(stockForm.gst) || 18,
        unit: stockForm.unit || 'PCS',
        createdAt: new Date().toISOString(),
      };
      updateStock([newItem, ...items]);
    }

    setShowAddModal(false);
    setEditingStockId(null);
    setStockForm(EMPTY_STOCK_ITEM);
  };

  const handleAdjustQuantity = (id, delta) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(0, (Number(item.stock) || 0) + delta);
        return { ...item, stock: newQty };
      }
      return item;
    });
    updateStock(updated);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to remove this item from your stock?')) {
      const updated = items.filter((item) => item.id !== id);
      updateStock(updated);
    }
  };

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">📦 Stock & Purchase Inward Management</h1>
          <p className="text-muted mb-0">
            Inward stock items by entering Purchase Bills row-by-row or importing Excel/CSV bill files.
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
            onClick={exportStockCSV}
            disabled={items.length === 0}
          >
            📤 Export Stock CSV
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={() => {
              setStockForm(EMPTY_STOCK_ITEM);
              setEditingStockId(null);
              setShowAddModal(true);
            }}
          >
            ＋ Add Single Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div
            className={`card shadow-sm border-0 p-3 h-100 ${activeTab === 'inventory' ? 'border border-primary bg-primary-subtle' : 'bg-light'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('inventory')}
          >
            <div className="text-muted small fw-bold text-uppercase">Total Item Catalog</div>
            <div className="h3 fw-bold text-primary mb-0">{items.length}</div>
            <small className="text-muted">Unique SKUs in catalog</small>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card shadow-sm border-0 p-3 bg-light h-100">
            <div className="text-muted small fw-bold text-uppercase">Total Available Units</div>
            <div className="h3 fw-bold text-success mb-0">{totalStockUnits.toLocaleString()}</div>
            <small className="text-muted">Ready for sales billing</small>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card shadow-sm border-0 p-3 bg-light h-100">
            <div className="text-muted small fw-bold text-uppercase">Stock Inventory Value</div>
            <div className="h3 fw-bold text-dark mb-0">
              ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <small className="text-muted">At current unit rates</small>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className={`card shadow-sm border-0 p-3 h-100 ${activeTab === 'purchase-history' ? 'border border-info bg-info-subtle' : 'bg-light'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('purchase-history')}
          >
            <div className="text-muted small fw-bold text-uppercase">Total Purchase Inwards</div>
            <div className="h3 fw-bold text-primary mb-0">
              ₹{totalPurchasesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <small className="text-muted">{(purchaseBills || []).length} Inward bills recorded</small>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills nav-fill bg-white p-2 rounded-3 shadow-sm border mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Current Stock Inventory ({items.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'manual-bill' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual-bill')}
          >
            ✍️ Inward Purchase Bill (Type Items)
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'import-file' ? 'active' : ''}`}
            onClick={() => setActiveTab('import-file')}
          >
            📥 Import Purchase Bill File (Excel/CSV)
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'purchase-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchase-history')}
          >
            📋 Purchase Bills History ({(purchaseBills || []).length})
          </button>
        </li>
      </ul>

      {/* TAB 1: CURRENT STOCK INVENTORY */}
      {activeTab === 'inventory' && (
        <>
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="input-group" style={{ maxWidth: '450px' }}>
                <span className="input-group-text bg-light border-end-0">🔍</span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search stock by product name or HSN code..."
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

              <div className="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  className={`btn btn-sm ${filterLowStock ? 'btn-danger' : 'btn-outline-secondary'}`}
                  onClick={() => setFilterLowStock((prev) => !prev)}
                >
                  ⚠️ Low Stock Filter (≤5) {lowStockCount > 0 ? `(${lowStockCount})` : ''}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-bold"
                  onClick={() => setActiveTab('manual-bill')}
                >
                  ＋ Inward New Stock
                </button>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body p-0">
              {filteredStock.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div className="fs-1 mb-2">📦</div>
                  <h3 className="h5 fw-bold mb-2">No stock items found.</h3>
                  <p className="text-muted small mb-3">
                    Inward items by typing a Purchase Bill or uploading an Excel file.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('manual-bill')}
                    >
                      ✍️ Enter Purchase Bill
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setActiveTab('import-file')}
                    >
                      📥 Import Excel File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Item Description</th>
                        <th>HSN Code</th>
                        <th className="text-end">Unit Rate (₹)</th>
                        <th className="text-center">GST Slab</th>
                        <th className="text-center" style={{ width: '180px' }}>
                          Available Stock
                        </th>
                        <th className="text-end">Total Valuation (₹)</th>
                        <th className="text-center" style={{ width: '130px' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map((item) => {
                        const isLow = Number(item.stock) <= 5;
                        const valuation = (Number(item.stock) || 0) * (Number(item.rate) || 0);

                        return (
                          <tr key={item.id} className={isLow ? 'table-warning' : ''}>
                            <td>
                              <div className="fw-semibold text-dark">{item.name}</div>
                              <small className="text-muted">Unit: {item.unit || 'PCS'}</small>
                            </td>
                            <td>
                              {item.hsn ? <code>{item.hsn}</code> : <span className="text-muted">—</span>}
                            </td>
                            <td className="text-end fw-semibold">₹{Number(item.rate || 0).toFixed(2)}</td>
                            <td className="text-center">
                              <span className="badge bg-secondary">{item.gst || 18}% GST</span>
                            </td>
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center gap-2">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm px-2 py-0"
                                  onClick={() => handleAdjustQuantity(item.id, -1)}
                                  title="Decrease stock by 1"
                                >
                                  −
                                </button>
                                <span className={`fw-bold ${isLow ? 'text-danger' : 'text-dark'}`}>
                                  {item.stock} {item.unit || 'PCS'}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm px-2 py-0"
                                  onClick={() => handleAdjustQuantity(item.id, 1)}
                                  title="Increase stock by 1"
                                >
                                  ＋
                                </button>
                              </div>
                              {isLow && <div className="text-danger small mt-1">⚠️ Low Stock</div>}
                            </td>
                            <td className="text-end fw-bold text-primary">₹{valuation.toFixed(2)}</td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary py-0 px-2"
                                  title="Edit item"
                                  onClick={() => {
                                    setStockForm({
                                      name: item.name,
                                      hsn: item.hsn || '',
                                      stock: item.stock,
                                      rate: item.rate,
                                      gst: item.gst || 18,
                                      unit: item.unit || 'PCS',
                                    });
                                    setEditingStockId(item.id);
                                    setShowAddModal(true);
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger py-0 px-2"
                                  title="Delete item"
                                  onClick={() => handleDeleteItem(item.id)}
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
            {filteredStock.length > 0 && (
              <div className="card-footer bg-light py-2 px-3 text-muted small d-flex justify-content-between">
                <span>
                  Showing {filteredStock.length} of {items.length} items
                </span>
                <span>Valuation: ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: MANUAL PURCHASE BILL ENTRY */}
      {activeTab === 'manual-bill' && (
        <PurchaseBillEntry
          vendors={vendors}
          stockItems={items}
          onSavePurchaseBill={handleSavePurchaseBill}
          onCancel={() => setActiveTab('inventory')}
        />
      )}

      {/* TAB 3: IMPORT PURCHASE BILL FILE */}
      {activeTab === 'import-file' && (
        <PurchaseImportFile
          onConfirmImport={handleConfirmFileImport}
          onCancel={() => setActiveTab('inventory')}
        />
      )}

      {/* TAB 4: PURCHASE BILLS HISTORY */}
      {activeTab === 'purchase-history' && (
        <PurchaseBillsList
          purchaseBills={purchaseBills}
          onNewBill={() => setActiveTab('manual-bill')}
        />
      )}

      {/* MODAL: SINGLE PRODUCT ADD / EDIT */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1200 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h2 className="modal-title h5 mb-0">
                  {editingStockId ? '✏️ Edit Stock Item' : '＋ Add Single Product'}
                </h2>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                />
              </div>

              <form onSubmit={handleSaveStockItem}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Item Name / Product Description *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Wireless Mouse, Laptop Adapter"
                      value={stockForm.name}
                      onChange={(e) =>
                        setStockForm((f) => ({ ...f, name: e.target.value }))
                      }
                      autoFocus
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">HSN / SAC Code</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 8471"
                        value={stockForm.hsn}
                        onChange={(e) =>
                          setStockForm((f) => ({ ...f, hsn: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Unit (UOM)</label>
                      <select
                        className="form-select"
                        value={stockForm.unit}
                        onChange={(e) =>
                          setStockForm((f) => ({ ...f, unit: e.target.value }))
                        }
                      >
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="NOS">NOS (Numbers)</option>
                        <option value="BOX">BOX (Boxes)</option>
                        <option value="KG">KG (Kilograms)</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="SET">SET (Sets)</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Available Quantity *</label>
                      <input
                        type="number"
                        className="form-control text-end"
                        min="0"
                        value={stockForm.stock}
                        onChange={(e) =>
                          setStockForm((f) => ({ ...f, stock: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Unit Rate (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control text-end"
                        placeholder="0.00"
                        value={stockForm.rate}
                        onChange={(e) =>
                          setStockForm((f) => ({ ...f, rate: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">GST Rate Slab</label>
                    <select
                      className="form-select"
                      value={stockForm.gst}
                      onChange={(e) =>
                        setStockForm((f) => ({ ...f, gst: e.target.value }))
                      }
                    >
                      <option value="0">0% (Nil / Exempt)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST (Standard)</option>
                      <option value="28">28% GST (Luxury)</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4">
                    {editingStockId ? '💾 Save Changes' : '＋ Add to Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockManagement;
