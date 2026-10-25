import { useState, useMemo } from 'react';
import { checkCatalogPaidAccess } from '../../services/productNetworkService.js';

export default function DiscoverProductsTab({
  products = [],
  catalogs = [],
  manufacturers = [],
  myImports = [],
  onImportToInventory,
  onBulkImportToInventory,
  onRequestConnection,
  onSelectProductDetails,
  onSubmitAccessRequest,
  currentUser,
  accessGrants = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedGstRate, setSelectedGstRate] = useState('');
  const [filterPaidStatus, setFilterPaidStatus] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [requestModalCatalog, setRequestModalCatalog] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');

  const isMasterAdmin =
    (currentUser?.username || '').toLowerCase() === 'admin' || currentUser?.role === 'Admin';

  // Set of imported product IDs for instant badge lookups
  const importedIdSet = useMemo(() => {
    return new Set(myImports.map((imp) => imp.networkProductId || imp.sku));
  }, [myImports]);

  // Map of catalog ID to access info
  const catalogAccessMap = useMemo(() => {
    const map = new Map();
    catalogs.forEach((c) => {
      map.set(c.id, checkCatalogPaidAccess(currentUser, currentUser?.licenseId, c.id));
    });
    return map;
  }, [catalogs, currentUser, accessGrants]);

  // Count of unlocked catalogs for this user
  const unlockedCatalogsCount = useMemo(() => {
    if (isMasterAdmin) return catalogs.length;
    return catalogs.filter((c) => catalogAccessMap.get(c.id)?.hasAccess).length;
  }, [catalogs, catalogAccessMap, isMasterAdmin]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const accessInfo = catalogAccessMap.get(p.catalogId) || { hasAccess: false };
      const isUnlocked = isMasterAdmin || accessInfo.hasAccess;

      // Paid status filter
      if (filterPaidStatus === 'unlocked' && !isUnlocked) return false;
      if (filterPaidStatus === 'locked' && isUnlocked) return false;

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.manufacturerName && p.manufacturerName.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.hsn && p.hsn.includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      // Category match
      const matchCat = !selectedCategory || p.category === selectedCategory;

      // Manufacturer match
      const matchMfr = !selectedManufacturer || p.manufacturerId === selectedManufacturer;

      // GST Rate match
      const matchGst = !selectedGstRate || String(p.gstRate) === selectedGstRate;

      return matchSearch && matchCat && matchMfr && matchGst;
    });
  }, [
    products,
    catalogAccessMap,
    isMasterAdmin,
    filterPaidStatus,
    searchQuery,
    selectedCategory,
    selectedManufacturer,
    selectedGstRate,
  ]);

  // Bulk selection toggles
  const handleToggleSelect = (id) => {
    const prod = products.find((p) => p.id === id);
    const accessInfo = catalogAccessMap.get(prod?.catalogId);
    if (!isMasterAdmin && !accessInfo?.hasAccess) {
      alert('This product belongs to a locked catalog. Paid access must be granted by the Admin before importing.');
      return;
    }

    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const selectable = filteredProducts.filter((p) => {
      const access = catalogAccessMap.get(p.catalogId);
      return isMasterAdmin || access?.hasAccess;
    });

    if (selectedProductIds.size === selectable.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(selectable.map((p) => p.id)));
    }
  };

  const handleBulkImport = () => {
    const selected = filteredProducts.filter((p) => selectedProductIds.has(p.id));
    if (selected.length === 0) return;
    onBulkImportToInventory(selected);
    setSelectedProductIds(new Set());
  };

  const handleSendRequest = (e) => {
    e.preventDefault();
    if (!requestModalCatalog) return;

    onSubmitAccessRequest({
      catalogId: requestModalCatalog.id,
      catalogName: requestModalCatalog.name,
      manufacturerName: requestModalCatalog.manufacturerName,
      username: currentUser?.username || 'user',
      licenseId: currentUser?.licenseId || 'N/A',
      companyName: currentUser?.companyName || currentUser?.username || 'Enterprise',
      notes: requestNotes.trim(),
    });

    alert(
      `✓ Paid activation request sent to Master Admin for "${requestModalCatalog.name}". The Admin will review and unlock this catalog for License ID: ${currentUser?.licenseId || 'your account'}.`
    );
    setRequestModalCatalog(null);
    setRequestNotes('');
  };

  return (
    <div className="discover-products-tab">
      {/* Paid Access Information Banner */}
      {!isMasterAdmin && unlockedCatalogsCount === 0 ? (
        <div
          className="alert alert-warning border-warning shadow-sm rounded-4 p-4 mb-4"
          role="alert"
        >
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-start gap-3">
              <span className="fs-2">🔒</span>
              <div>
                <h5 className="fw-bold text-dark mb-1">
                  Paid Manufacturer Catalogs — Admin Activation Required
                </h5>
                <p className="small text-dark text-opacity-80 mb-0" style={{ maxWidth: '680px', lineHeight: '1.5' }}>
                  Access to verified manufacturer catalogs is paid and strictly controlled. You currently do not have any active catalog grants. The <strong>Master Admin</strong> must grant access to selected catalogs for your License ID (<strong>{currentUser?.licenseId || 'Your License'}</strong>). Browse the official catalogs below and tap <strong>"Request Paid Activation"</strong>.
                </p>
              </div>
            </div>
            <div className="text-md-end text-nowrap">
              <span className="badge bg-dark font-monospace text-warning px-3 py-2 fs-7 d-block mb-1">
                License: {currentUser?.licenseId || 'Pending'}
              </span>
              <span className="small text-muted">0 Paid Catalogs Active</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="alert alert-success border-success shadow-xs rounded-3 p-3 mb-4 d-flex justify-content-between align-items-center"
          role="alert"
        >
          <div className="d-flex align-items-center gap-2 small">
            <span className="fs-5">✓</span>
            <span>
              <strong>{isMasterAdmin ? 'Master Admin Mode' : 'Paid Access Active'}:</strong>{' '}
              {isMasterAdmin
                ? 'You have unrestricted administrator access to all network catalogs.'
                : `You have active paid access to ${unlockedCatalogsCount} verified manufacturer catalogs.`}
            </span>
          </div>
          <span className="badge bg-success font-monospace">
            {unlockedCatalogsCount} Unlocked
          </span>
        </div>
      )}

      {/* Title & View Switcher */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            Discover Products Marketplace
          </h4>
          <span className="small text-muted">
            Search verified manufacturer catalogs and import standardized products directly into your billing inventory.
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {selectedProductIds.size > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-primary fw-bold shadow-sm d-flex align-items-center gap-2"
              onClick={handleBulkImport}
            >
              <span>📥</span>
              <span>Import Selected ({selectedProductIds.size})</span>
            </button>
          )}

          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${viewMode === 'grid' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('grid')}
              title="Grid Card View"
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'table' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('table')}
              title="Dense Table View"
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card border-0 rounded-4 shadow-sm p-3 bg-white mb-4">
        <div className="row g-2">
          <div className="col-lg-4 col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">🔍</span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search products by name, SKU, barcode, HSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-lg-2 col-md-6">
            <select
              className="form-select form-select-sm"
              value={filterPaidStatus}
              onChange={(e) => setFilterPaidStatus(e.target.value)}
            >
              <option value="all">All Catalogs</option>
              <option value="unlocked">✓ My Paid Catalogs Only</option>
              <option value="locked">🔒 Locked / Subscription Required</option>
            </select>
          </div>

          <div className="col-lg-2 col-md-6">
            <select
              className="form-select form-select-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {[...new Set(products.map((p) => p.category))].filter(Boolean).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="col-lg-2 col-md-6">
            <select
              className="form-select form-select-sm"
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-lg-2 col-md-6">
            <select
              className="form-select form-select-sm"
              value={selectedGstRate}
              onChange={(e) => setSelectedGstRate(e.target.value)}
            >
              <option value="">All GST Rates</option>
              <option value="0">0% GST</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top small text-muted">
          <div>
            Showing <strong>{filteredProducts.length}</strong> products &bull;{' '}
            <span className="text-success fw-semibold">
              {filteredProducts.filter((p) => isMasterAdmin || catalogAccessMap.get(p.catalogId)?.hasAccess).length} Unlocked
            </span>{' '}
            / {filteredProducts.length} Total
          </div>
          {(searchQuery || selectedCategory || selectedManufacturer || selectedGstRate || filterPaidStatus !== 'all') && (
            <button
              type="button"
              className="btn btn-sm btn-link text-danger text-decoration-none p-0 fw-semibold"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedManufacturer('');
                setSelectedGstRate('');
                setFilterPaidStatus('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid or Table Presentation */}
      {filteredProducts.length === 0 ? (
        <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
          <span className="fs-1 text-muted d-block mb-2">🔍</span>
          <h5 className="fw-bold text-dark">No Products Matched Your Filter</h5>
          <p className="small text-muted mb-0">
            Try adjusting your search query or reset the filters above.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="row g-3">
          {filteredProducts.map((p) => {
            const isImported = importedIdSet.has(p.id) || (p.sku && importedIdSet.has(p.sku));
            const isSelected = selectedProductIds.has(p.id);
            const parentCat = catalogs.find((c) => c.id === p.catalogId);
            const accessInfo = catalogAccessMap.get(p.catalogId) || { hasAccess: false };
            const isUnlocked = isMasterAdmin || accessInfo.hasAccess;

            return (
              <div key={p.id} className="col-xl-3 col-lg-4 col-md-6">
                <div
                  className={`card border-0 rounded-3 shadow-sm h-100 bg-white product-card-hover transition-all position-relative overflow-hidden ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{
                    border: !isUnlocked
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : isSelected
                      ? '2px solid #2563eb'
                      : '1px solid #e2e8f0',
                  }}
                >
                  {/* Select Checkbox (only for unlocked items) */}
                  {isUnlocked && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 3 }}>
                      <input
                        type="checkbox"
                        className="form-check-input shadow-xs"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(p.id)}
                      />
                    </div>
                  )}

                  {/* Top Status Badges */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 3 }}>
                    {!isUnlocked ? (
                      <span className="badge bg-warning text-dark shadow-xs px-2 py-1 fw-bold" style={{ fontSize: '10px' }}>
                        🔒 Paid (Locked)
                      </span>
                    ) : isImported ? (
                      <span className="badge bg-success shadow-xs px-2 py-1" style={{ fontSize: '10px' }}>
                        ✓ In My Stock
                      </span>
                    ) : (
                      <span className="badge bg-success bg-opacity-90 shadow-xs px-2 py-1" style={{ fontSize: '10px' }}>
                        ✓ Paid Access Active
                      </span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="overflow-hidden bg-light text-center position-relative"
                    style={{ height: '160px', cursor: isUnlocked ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (isUnlocked) onSelectProductDetails(p);
                    }}
                  >
                    <img
                      src={p.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60'}
                      alt={p.name}
                      className="w-100 h-100"
                      style={{
                        objectFit: 'cover',
                        filter: !isUnlocked ? 'grayscale(80%) blur(1px)' : 'none',
                      }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=60';
                      }}
                    />
                    {!isUnlocked && (
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white"
                        style={{ background: 'rgba(9, 13, 22, 0.65)' }}
                      >
                        <span className="fs-3 mb-1">🔒</span>
                        <span className="fw-bold small text-warning font-monospace" style={{ fontSize: '11px' }}>
                          ₹{parentCat?.pricePerYear || 1499} / Year
                        </span>
                        <span className="small text-white-50" style={{ fontSize: '10px' }}>
                          Admin Must Grant Access
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="card-body p-3 d-flex flex-column justify-content-between">
                    <div>
                      {/* Manufacturer & Category */}
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-primary fw-bold text-truncate" style={{ maxWidth: '140px', fontSize: '11px' }}>
                          🏢 {p.manufacturerName}
                        </span>
                        <span className="badge bg-light text-muted border" style={{ fontSize: '10px' }}>
                          {p.category}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h6
                        className="fw-bold text-dark mb-2 text-truncate-2"
                        style={{
                          fontSize: '13.5px',
                          lineHeight: '1.4',
                          height: '38px',
                          cursor: isUnlocked ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (isUnlocked) onSelectProductDetails(p);
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </h6>

                      {/* Identifiers & Tax Tag */}
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        <span className="badge bg-secondary bg-opacity-10 text-secondary font-monospace" style={{ fontSize: '10px' }}>
                          SKU: {p.sku || '—'}
                        </span>
                        <span className="badge bg-info bg-opacity-10 text-info font-monospace" style={{ fontSize: '10px' }}>
                          HSN: {p.hsn || '—'}
                        </span>
                        <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '10px' }}>
                          {p.gstRate !== undefined ? `${p.gstRate}% GST` : '18% GST'}
                        </span>
                      </div>
                    </div>

                    {/* Pricing & Import Button */}
                    <div className="pt-2 border-top mt-2">
                      <div className="d-flex justify-content-between align-items-baseline mb-2">
                        <div>
                          <span className="small text-muted" style={{ fontSize: '11px' }}>
                            Wholesale:
                          </span>{' '}
                          {isUnlocked ? (
                            <span className="fw-bold text-dark font-monospace" style={{ fontSize: '15px' }}>
                              ₹{(p.wholesalePrice || 0).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-muted font-monospace" style={{ fontSize: '13px' }}>
                              🔒 Hidden
                            </span>
                          )}
                        </div>
                        <div className="small text-muted text-decoration-line-through font-monospace" style={{ fontSize: '12px' }}>
                          MRP: ₹{(p.mrp || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        {isUnlocked ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary w-50 py-1"
                              onClick={() => onSelectProductDetails(p)}
                              style={{ fontSize: '12px' }}
                            >
                              Specs
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${isImported ? 'btn-outline-success disabled' : 'btn-primary'} w-50 py-1 fw-semibold`}
                              onClick={() => {
                                if (!isImported) onImportToInventory(p);
                              }}
                              style={{ fontSize: '12px' }}
                            >
                              {isImported ? '✓ In Stock' : '📥 Import'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning text-dark fw-bold w-100 py-1 shadow-xs"
                            onClick={() => setRequestModalCatalog(parentCat || { id: p.catalogId, name: p.manufacturerName, manufacturerName: p.manufacturerName })}
                            style={{ fontSize: '12px' }}
                          >
                            📩 Request Paid Activation
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light text-muted fw-semibold">
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedProductIds.size > 0 && selectedProductIds.size === filteredProducts.filter((p) => isMasterAdmin || catalogAccessMap.get(p.catalogId)?.hasAccess).length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Product &amp; SKU</th>
                  <th>Manufacturer</th>
                  <th>Category</th>
                  <th>HSN Code</th>
                  <th>GST %</th>
                  <th>Wholesale</th>
                  <th>MRP</th>
                  <th>Access License</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isImported = importedIdSet.has(p.id) || (p.sku && importedIdSet.has(p.sku));
                  const isSelected = selectedProductIds.has(p.id);
                  const parentCat = catalogs.find((c) => c.id === p.catalogId);
                  const accessInfo = catalogAccessMap.get(p.catalogId) || { hasAccess: false };
                  const isUnlocked = isMasterAdmin || accessInfo.hasAccess;

                  return (
                    <tr key={p.id} className={isSelected ? 'table-primary' : ''}>
                      <td>
                        {isUnlocked && (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(p.id)}
                          />
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={p.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=80&auto=format&fit=crop&q=60'}
                            alt={p.name}
                            className="rounded-2 border flex-shrink-0"
                            style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                          />
                          <div>
                            <div
                              className="fw-bold text-dark text-truncate"
                              style={{ maxWidth: '240px', cursor: isUnlocked ? 'pointer' : 'default' }}
                              onClick={() => {
                                if (isUnlocked) onSelectProductDetails(p);
                              }}
                            >
                              {p.name}
                            </div>
                            <span className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                              SKU: {p.sku || 'N/A'} {p.barcode ? `• ${p.barcode}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">{p.manufacturerName}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{p.category}</span>
                      </td>
                      <td>
                        <span className="badge bg-primary bg-opacity-10 text-primary border font-monospace">
                          {p.hsn || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success bg-opacity-10 text-success border">
                          {p.gstRate !== undefined ? `${p.gstRate}%` : '18%'}
                        </span>
                      </td>
                      <td className="fw-bold font-monospace text-dark">
                        {isUnlocked ? `₹${(p.wholesalePrice || 0).toLocaleString('en-IN')}` : '🔒 Paid'}
                      </td>
                      <td className="text-muted font-monospace">
                        ₹{(p.mrp || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        {isUnlocked ? (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                            ✓ Active Grant
                          </span>
                        ) : (
                          <span className="badge bg-warning bg-opacity-25 text-dark border border-warning">
                            🔒 Paid Required
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        {isUnlocked ? (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary py-1"
                              onClick={() => onSelectProductDetails(p)}
                              title="View Specs"
                            >
                              👁️
                            </button>
                            <button
                              type="button"
                              className={`btn ${isImported ? 'btn-outline-success disabled' : 'btn-primary'} py-1 fw-semibold`}
                              onClick={() => {
                                if (!isImported) onImportToInventory(p);
                              }}
                            >
                              {isImported ? '✓ In Stock' : '📥 Import'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-dark fw-bold py-1"
                            onClick={() => setRequestModalCatalog(parentCat || { id: p.catalogId, name: p.manufacturerName, manufacturerName: p.manufacturerName })}
                          >
                            📩 Request Access
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
      )}

      {/* MODAL: Request Paid Activation from Admin */}
      {requestModalCatalog && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1250 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">🔒</span>
                  <h5 className="modal-title fw-bold mb-0" style={{ fontSize: '16px' }}>
                    Request Paid Catalog Activation
                  </h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setRequestModalCatalog(null)} />
              </div>
              <form onSubmit={handleSendRequest}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="small text-muted">Requested Manufacturer Catalog:</div>
                    <h6 className="fw-bold text-dark mb-1">{requestModalCatalog.name}</h6>
                    <span className="small text-primary font-monospace fw-semibold">
                      Annual License Fee: ₹{requestModalCatalog.pricePerYear || 1499} / Year
                    </span>
                  </div>

                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="small text-muted">Your Customer Account &amp; License:</div>
                    <div className="fw-bold text-dark">{currentUser?.companyName || currentUser?.username}</div>
                    <div className="small text-muted font-monospace mt-1">
                      License ID: <strong className="text-warning bg-dark px-2 py-0 rounded">{currentUser?.licenseId || '91-XX-XXX-XXXXXX'}</strong>
                    </div>
                  </div>

                  <div className="mb-0">
                    <label className="form-label small fw-semibold text-muted">Note to Master Admin (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Please activate Havells catalog for our Noida distribution branch..."
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setRequestModalCatalog(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold px-4 shadow-sm">
                    Submit Request to Admin
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
