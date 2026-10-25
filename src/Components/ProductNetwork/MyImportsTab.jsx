import { useState, useMemo } from 'react';

export default function MyImportsTab({
  myImports = [],
  stockItems = [],
  onSyncImportsToStock,
  onMapToLocalStock,
  onRemoveImport,
  onSelectProductDetails,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterMappingStatus, setFilterMappingStatus] = useState('all');
  const [selectedImportIds, setSelectedImportIds] = useState(new Set());
  const [mappingModalItem, setMappingModalItem] = useState(null);
  const [selectedStockTargetId, setSelectedStockTargetId] = useState('');

  // Build a lookup map of existing TREAD stock items
  const stockItemMap = useMemo(() => {
    const map = new Map();
    stockItems.forEach((s) => {
      map.set(s.id, s);
      if (s.sku) map.set(s.sku.toLowerCase(), s);
      if (s.barcode) map.set(s.barcode.toLowerCase(), s);
      if (s.name) map.set(s.name.toLowerCase().trim(), s);
    });
    return map;
  }, [stockItems]);

  // Filtered imports
  const filteredImports = useMemo(() => {
    return myImports.filter((imp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        imp.productName.toLowerCase().includes(q) ||
        (imp.sku && imp.sku.toLowerCase().includes(q)) ||
        (imp.barcode && imp.barcode.toLowerCase().includes(q)) ||
        (imp.hsn && imp.hsn.includes(q)) ||
        (imp.manufacturerName && imp.manufacturerName.toLowerCase().includes(q));

      const matchMfr = !filterManufacturer || imp.manufacturerId === filterManufacturer;

      const isMapped = !!imp.localStockItemId && stockItemMap.has(imp.localStockItemId);
      const matchStatus =
        filterMappingStatus === 'all' ||
        (filterMappingStatus === 'mapped' && isMapped) ||
        (filterMappingStatus === 'unmapped' && !isMapped);

      return matchSearch && matchMfr && matchStatus;
    });
  }, [myImports, searchQuery, filterManufacturer, filterMappingStatus, stockItemMap]);

  // Bulk selection
  const handleToggleSelect = (id) => {
    setSelectedImportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedImportIds.size === filteredImports.length) {
      setSelectedImportIds(new Set());
    } else {
      setSelectedImportIds(new Set(filteredImports.map((i) => i.id)));
    }
  };

  const handleBulkSync = () => {
    const selected = filteredImports.filter((i) => selectedImportIds.has(i.id));
    if (selected.length === 0) return;
    onSyncImportsToStock(selected);
    setSelectedImportIds(new Set());
    alert(`✓ Synchronized ${selected.length} items with TREAD inventory. Local stock and prices are preserved.`);
  };

  // Confirm manual mapping
  const handleConfirmMapping = () => {
    if (!mappingModalItem) return;
    onMapToLocalStock(mappingModalItem.id, selectedStockTargetId || null);
    setMappingModalItem(null);
    setSelectedStockTargetId('');
  };

  return (
    <div className="my-imports-tab">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            My Catalog Imports &amp; Inventory Mapping
          </h4>
          <span className="small text-muted">
            Track products imported from manufacturer catalogs, map them to local stock records, and preserve your private stock counts.
          </span>
        </div>

        {/* Bulk Sync Action */}
        <div className="d-flex align-items-center gap-2">
          {selectedImportIds.size > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-success fw-bold shadow-sm d-flex align-items-center gap-1"
              onClick={handleBulkSync}
            >
              <span>🔄</span>
              <span>Sync Selected to TREAD ({selectedImportIds.size})</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm btn-primary fw-bold shadow-sm d-flex align-items-center gap-1"
            onClick={() => {
              onSyncImportsToStock(myImports);
              alert('✓ All catalog imports synchronized with TREAD stock items.');
            }}
          >
            <span>🔄</span>
            <span>Sync All to Inventory</span>
          </button>
        </div>
      </div>

      {/* Non-Destructive Info Strip */}
      <div
        className="card border-0 rounded-3 p-3 mb-4 shadow-xs"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          borderLeft: '4px solid #2563eb',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <span className="fs-4">🛡️</span>
          <div className="small text-dark">
            <strong>Non-Destructive Local Inventory Policy:</strong> When catalog products are imported or synchronized, your physical stock counts, past invoice records, purchase ledger entries, and custom profit margins remain completely untouched. Only standardized HSN, GST slabs, and manufacturer technical parameters are linked.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card border-0 rounded-4 shadow-sm p-3 bg-white mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">🔍</span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search imported products by name, SKU, HSN, manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
            >
              <option value="">All Source Manufacturers</option>
              {[...new Set(myImports.map((i) => i.manufacturerName))].filter(Boolean).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={filterMappingStatus}
              onChange={(e) => setFilterMappingStatus(e.target.value)}
            >
              <option value="all">All Mapping Statuses</option>
              <option value="mapped">✓ Mapped to Local Stock</option>
              <option value="unmapped">Pending Mapping</option>
            </select>
          </div>
        </div>
      </div>

      {/* Imports Table */}
      {filteredImports.length === 0 ? (
        <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
          <span className="fs-1 text-muted d-block mb-2">📦</span>
          <h5 className="fw-bold text-dark">No Products Imported Yet</h5>
          <p className="small text-muted mb-3">
            Explore participating manufacturer catalogs in <strong>Discover Products</strong> or upload an Excel catalog to import products into your business.
          </p>
        </div>
      ) : (
        <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light text-muted fw-semibold">
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedImportIds.size === filteredImports.length && filteredImports.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Product &amp; SKU</th>
                  <th>Source Manufacturer</th>
                  <th>HSN Code</th>
                  <th>GST Rate</th>
                  <th>Catalog Wholesale</th>
                  <th>Local Stock Qty</th>
                  <th>Local Selling Rate</th>
                  <th>Inventory Link</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredImports.map((imp) => {
                  const isSelected = selectedImportIds.has(imp.id);
                  const matchedLocalStock =
                    imp.localStockItemId && stockItemMap.has(imp.localStockItemId)
                      ? stockItemMap.get(imp.localStockItemId)
                      : stockItemMap.get(imp.productName?.toLowerCase().trim()) || null;

                  return (
                    <tr key={imp.id} className={isSelected ? 'table-primary' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(imp.id)}
                        />
                      </td>
                      <td>
                        <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '240px' }}>
                          {imp.productName}
                        </div>
                        <div className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                          SKU: {imp.sku || 'N/A'} {imp.barcode ? `• Barcode: ${imp.barcode}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">{imp.manufacturerName}</span>
                        <div className="small text-muted font-monospace" style={{ fontSize: '10.5px' }}>
                          Catalog {imp.catalogVersion || 'v1.0'}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-primary bg-opacity-10 text-primary border font-monospace">
                          {imp.hsn || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success bg-opacity-10 text-success border">
                          {imp.gstRate !== undefined ? `${imp.gstRate}%` : '18%'}
                        </span>
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        ₹{(imp.networkWholesalePrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace fw-bold px-2 py-1">
                          {matchedLocalStock?.stock !== undefined ? matchedLocalStock.stock : imp.localStockQty || 0} {imp.unit || 'PCS'}
                        </span>
                      </td>
                      <td>
                        <span className="fw-bold text-success font-monospace">
                          ₹{(matchedLocalStock?.rate !== undefined ? matchedLocalStock.rate : imp.localSellingPrice || imp.networkWholesalePrice || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        {matchedLocalStock ? (
                          <span
                            className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25"
                            title={`Linked to TREAD stock: ${matchedLocalStock.name}`}
                          >
                            ✓ Synced in Stock
                          </span>
                        ) : (
                          <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30">
                            Pending Stock Sync
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-primary py-0 px-2"
                            onClick={() => {
                              setMappingModalItem(imp);
                              setSelectedStockTargetId(imp.localStockItemId || '');
                            }}
                            title="Map to existing TREAD item"
                          >
                            🔗 Map
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger py-0 px-2"
                            onClick={() => onRemoveImport(imp.id)}
                            title="Remove from imported list"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {mappingModalItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  🔗 Map Manufacturer Product to Local Stock
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMappingModalItem(null)} />
              </div>
              <div className="modal-body p-4">
                <div className="p-3 bg-light rounded-3 mb-3 border">
                  <div className="small text-muted">Manufacturer Product:</div>
                  <div className="fw-bold text-dark">{mappingModalItem.productName}</div>
                  <div className="small text-muted font-monospace mt-1">
                    SKU: {mappingModalItem.sku || 'N/A'} &bull; HSN: {mappingModalItem.hsn} &bull; GST: {mappingModalItem.gstRate}%
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Select Target Local TREAD Stock Item:
                  </label>
                  <select
                    className="form-select"
                    value={selectedStockTargetId}
                    onChange={(e) => setSelectedStockTargetId(e.target.value)}
                  >
                    <option value="">-- Create or Auto-Link to New Stock Item --</option>
                    {stockItems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Current Stock: {s.stock} {s.unit || 'PCS'} • Rate: ₹{s.rate})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="alert alert-info py-2 px-3 small mb-0">
                  ℹ️ Mapping ensures billing invoices populate the verified manufacturer specifications while keeping your local inventory count and custom sales prices intact.
                </div>
              </div>
              <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setMappingModalItem(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary fw-bold px-4" onClick={handleConfirmMapping}>
                  Confirm Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
