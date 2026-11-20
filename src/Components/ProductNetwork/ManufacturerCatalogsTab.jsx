import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STANDARD_GST_RATES, validateProductRow } from '../../services/productNetworkService.js';

export default function ManufacturerCatalogsTab({
  catalogs = [],
  products = [],
  manufacturers = [],
  onSaveCatalogs,
  onSaveProducts,
  onPublishVersion,
  onOpenAiImport,
  onSelectProductDetails,
  company,
  currentUser,
}) {
  const [selectedCatalogId, setSelectedCatalogId] = useState(catalogs[0]?.id || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showValidationReviewModal, setShowValidationReviewModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for creating a new catalog
  const [newCatForm, setNewCatForm] = useState({
    name: '',
    category: 'Electrical & Electronics',
    version: 'v1.0.0',
    description: '',
    sharingMode: 'connection_only',
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  // Form state for adding/editing a product
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'General',
    hsn: '8536',
    gstRate: 18,
    unit: 'PCS',
    packSize: '10 Pcs / Box',
    mrp: 100,
    wholesalePrice: 70,
    moq: 10,
    specs: '',
    description: '',
    imageUrl: '',
  });

  // Form state for publishing a version
  const [publishForm, setPublishForm] = useState({
    newVersion: '',
    changeNotes: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  // Active catalog
  const activeCatalog = useMemo(() => {
    return catalogs.find((c) => c.id === selectedCatalogId) || catalogs[0] || null;
  }, [catalogs, selectedCatalogId]);

  // Products belonging to active catalog
  const catalogProducts = useMemo(() => {
    if (!activeCatalog) return [];
    return products.filter((p) => p.catalogId === activeCatalog.id);
  }, [products, activeCatalog]);

  // Filtered catalog products
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.hsn && p.hsn.includes(searchQuery));
      const matchCat = !filterCategory || p.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [catalogProducts, searchQuery, filterCategory]);

  // Real-time catalog validation audit
  const validationSummary = useMemo(() => {
    if (!catalogProducts || catalogProducts.length === 0) {
      return { total: 0, valid: 0, warnings: 0, errors: 0, issues: [] };
    }
    const issues = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    catalogProducts.forEach((p, idx) => {
      const audit = validateProductRow(p, idx, catalogProducts);
      if (audit.errors.length > 0) {
        errorCount += 1;
        issues.push({ product: p, type: 'error', messages: audit.errors });
      } else if (audit.warnings.length > 0) {
        warningCount += 1;
        issues.push({ product: p, type: 'warning', messages: audit.warnings });
      } else {
        validCount += 1;
      }
    });

    return {
      total: catalogProducts.length,
      valid: validCount,
      warnings: warningCount,
      errors: errorCount,
      issues,
    };
  }, [catalogProducts]);

  // Create Catalog handler
  const handleCreateCatalog = (e) => {
    e.preventDefault();
    if (!newCatForm.name.trim()) {
      alert('Please enter a catalog name.');
      return;
    }

    const created = {
      id: `cat-${uuidv4().slice(0, 8)}`,
      manufacturerId: `mfr-${currentUser?.username || 'company'}`,
      manufacturerName: company?.name || `${currentUser?.username || 'Authorized'} Brand`,
      name: newCatForm.name.trim(),
      version: newCatForm.version.trim() || 'v1.0.0',
      category: newCatForm.category,
      description: newCatForm.description.trim(),
      status: 'draft',
      publishedAt: null,
      effectiveDate: newCatForm.effectiveDate,
      productsCount: 0,
      sharingMode: newCatForm.sharingMode,
      changeNotes: 'Initial catalog creation.',
    };

    const updated = [created, ...catalogs];
    onSaveCatalogs(updated);
    setSelectedCatalogId(created.id);
    setShowCreateModal(false);
    setNewCatForm({
      name: '',
      category: 'Electrical & Electronics',
      version: 'v1.0.0',
      description: '',
      sharingMode: 'connection_only',
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
  };

  // Add or Edit Product handler
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!prodForm.name.trim()) {
      alert('Please enter a product name.');
      return;
    }
    if (!activeCatalog) return;

    if (editingProductId) {
      const updated = products.map((p) =>
        p.id === editingProductId
          ? {
              ...p,
              name: prodForm.name.trim(),
              sku: prodForm.sku.trim(),
              barcode: prodForm.barcode.trim(),
              category: prodForm.category.trim(),
              hsn: prodForm.hsn.trim(),
              gstRate: Number(prodForm.gstRate) || 18,
              unit: prodForm.unit.trim().toUpperCase() || 'PCS',
              packSize: prodForm.packSize.trim(),
              mrp: Math.max(0, Number(prodForm.mrp) || 0),
              wholesalePrice: Math.max(0, Number(prodForm.wholesalePrice) || 0),
              moq: Math.max(1, Number(prodForm.moq) || 1),
              description: prodForm.description.trim(),
              imageUrl: prodForm.imageUrl.trim(),
            }
          : p
      );
      onSaveProducts(updated);
    } else {
      const newProd = {
        id: `prod-${uuidv4().slice(0, 8)}`,
        catalogId: activeCatalog.id,
        manufacturerId: activeCatalog.manufacturerId,
        manufacturerName: activeCatalog.manufacturerName,
        name: prodForm.name.trim(),
        sku: prodForm.sku.trim(),
        barcode: prodForm.barcode.trim(),
        category: prodForm.category.trim(),
        hsn: prodForm.hsn.trim(),
        gstRate: Number(prodForm.gstRate) || 18,
        unit: prodForm.unit.trim().toUpperCase() || 'PCS',
        packSize: prodForm.packSize.trim(),
        mrp: Math.max(0, Number(prodForm.mrp) || 0),
        wholesalePrice: Math.max(0, Number(prodForm.wholesalePrice) || 0),
        moq: Math.max(1, Number(prodForm.moq) || 1),
        specs: prodForm.specs ? { Details: prodForm.specs } : {},
        description: prodForm.description.trim(),
        imageUrl:
          prodForm.imageUrl.trim() ||
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60',
        catalogVersion: activeCatalog.version,
        status: 'active',
      };
      const updated = [newProd, ...products];
      onSaveProducts(updated);

      // Update product count on active catalog
      const updatedCats = catalogs.map((c) =>
        c.id === activeCatalog.id ? { ...c, productsCount: (c.productsCount || 0) + 1 } : c
      );
      onSaveCatalogs(updatedCats);
    }

    setShowAddProductModal(false);
    setEditingProductId(null);
    setProdForm({
      name: '',
      sku: '',
      barcode: '',
      category: 'General',
      hsn: '8536',
      gstRate: 18,
      unit: 'PCS',
      packSize: '10 Pcs / Box',
      mrp: 100,
      wholesalePrice: 70,
      moq: 10,
      specs: '',
      description: '',
      imageUrl: '',
    });
  };

  const handleEditProductClick = (prod) => {
    setEditingProductId(prod.id);
    setProdForm({
      name: prod.name || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      category: prod.category || 'General',
      hsn: prod.hsn || '',
      gstRate: prod.gstRate !== undefined ? prod.gstRate : 18,
      unit: prod.unit || 'PCS',
      packSize: prod.packSize || '',
      mrp: prod.mrp || 0,
      wholesalePrice: prod.wholesalePrice || 0,
      moq: prod.moq || 1,
      specs: typeof prod.specs === 'object' ? Object.values(prod.specs).join(', ') : '',
      description: prod.description || '',
      imageUrl: prod.imageUrl || '',
    });
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = (prodId) => {
    if (!window.confirm('Are you sure you want to remove this product from the catalog?')) return;
    const updated = products.filter((p) => p.id !== prodId);
    onSaveProducts(updated);

    if (activeCatalog) {
      const updatedCats = catalogs.map((c) =>
        c.id === activeCatalog.id ? { ...c, productsCount: Math.max(0, (c.productsCount || 1) - 1) } : c
      );
      onSaveCatalogs(updatedCats);
    }
  };

  // Publish version handler
  const handlePublishVersionSubmit = (e) => {
    e.preventDefault();
    if (!activeCatalog) return;

    if (validationSummary.errors > 0) {
      alert(`Cannot publish version with ${validationSummary.errors} blocking errors. Please correct them first.`);
      return;
    }

    const nextVer = publishForm.newVersion.trim() || activeCatalog.version;
    onPublishVersion(activeCatalog.id, nextVer, publishForm.changeNotes, publishForm.effectiveDate);
    setShowPublishModal(false);
    alert(`✓ Catalog ${activeCatalog.name} published as ${nextVer} successfully!`);
  };

  return (
    <div className="manufacturer-catalogs-tab">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            Manufacturer Catalogs &amp; Master Price Lists
          </h4>
          <span className="small text-muted">
            Create, curate, and publish version-controlled product catalogs for authorized distributors.
          </span>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2"
            onClick={onOpenAiImport}
          >
            <span>📥</span>
            <span>Bulk Excel / CSV Upload</span>
          </button>
          <button
            type="button"
            className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <span>＋</span>
            <span>Create New Catalog</span>
          </button>
        </div>
      </div>

      {/* Catalog Selector Strip */}
      <div className="d-flex align-items-center gap-2 overflow-x-auto pb-3 mb-3">
        {catalogs.map((cat) => {
          const isSelected = cat.id === activeCatalog?.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`btn text-start p-3 rounded-3 border flex-shrink-0 transition-all ${
                isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-dark border-light-subtle'
              }`}
              style={{ minWidth: '240px', maxWidth: '300px' }}
              onClick={() => setSelectedCatalogId(cat.id)}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className={`badge ${isSelected ? 'bg-white text-primary' : 'bg-secondary bg-opacity-10 text-secondary'}`} style={{ fontSize: '10px' }}>
                  {cat.version}
                </span>
                <span className={`badge ${cat.status === 'published' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '9px' }}>
                  {cat.status === 'published' ? '✓ PUBLISHED' : 'DRAFT'}
                </span>
              </div>
              <div className="fw-bold text-truncate" style={{ fontSize: '13.5px' }}>
                {cat.name}
              </div>
              <div className={`small ${isSelected ? 'text-white-50' : 'text-muted'} d-flex justify-content-between mt-1`} style={{ fontSize: '11px' }}>
                <span>{cat.category}</span>
                <span>{products.filter((p) => p.catalogId === cat.id).length} items</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeCatalog ? (
        <div className="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
          {/* Active Catalog Overview Bar */}
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 pb-3 mb-3 border-bottom">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h5 className="fw-bold mb-0 text-dark">{activeCatalog.name}</h5>
                <span className="badge bg-primary font-monospace">{activeCatalog.version}</span>
                <span className="badge bg-secondary bg-opacity-10 text-secondary border">
                  {activeCatalog.sharingMode === 'public' ? '🌐 Public Access' : '🔒 Connection-Only'}
                </span>
              </div>
              <p className="text-muted small mb-0" style={{ maxWidth: '650px' }}>
                {activeCatalog.description || 'Verified manufacturer master catalog with pre-mapped tax rates.'}
              </p>
            </div>

            {/* Catalog Action Buttons */}
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => setShowValidationReviewModal(true)}
              >
                <span>🛡️</span>
                <span>Audit Quality ({validationSummary.errors} errors, {validationSummary.warnings} warnings)</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
                onClick={() => setShowShareModal(true)}
              >
                <span>👥</span>
                <span>Sharing &amp; Access</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1"
                onClick={() => {
                  setPublishForm({
                    newVersion: activeCatalog.version.replace(/(\d+)$/, (n) => Number(n) + 1),
                    changeNotes: '',
                    effectiveDate: new Date().toISOString().slice(0, 10),
                  });
                  setShowPublishModal(true);
                }}
              >
                <span>🚀</span>
                <span>Publish Version</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary fw-bold d-flex align-items-center gap-1"
                onClick={() => {
                  setEditingProductId(null);
                  setProdForm({
                    name: '',
                    sku: '',
                    barcode: '',
                    category: activeCatalog.category || 'General',
                    hsn: '8536',
                    gstRate: 18,
                    unit: 'PCS',
                    packSize: '10 Pcs / Box',
                    mrp: 100,
                    wholesalePrice: 70,
                    moq: 10,
                    specs: '',
                    description: '',
                    imageUrl: '',
                  });
                  setShowAddProductModal(true);
                }}
              >
                <span>＋</span>
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="row g-2 mb-3 align-items-center">
            <div className="col-md-6 col-lg-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">🔍</span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search products by name, SKU, barcode, HSN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <select
                className="form-select form-select-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Product Categories</option>
                {[...new Set(catalogProducts.map((p) => p.category))].filter(Boolean).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="col text-end small text-muted">
              Showing <strong>{filteredProducts.length}</strong> of {catalogProducts.length} items
            </div>
          </div>

          {/* Products Table */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-5 bg-light rounded-3 border">
              <span className="fs-1 text-muted d-block mb-2">📦</span>
              <h6 className="fw-bold text-dark">No Products Found in This Catalog</h6>
              <p className="small text-muted mb-3">
                Add products individually or upload an Excel / CSV price list to populate this catalog.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowAddProductModal(true)}
                >
                  ＋ Add Single Product
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={onOpenAiImport}
                >
                  📥 Upload Excel / CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light text-muted fw-semibold">
                  <tr>
                    <th>Product &amp; SKU</th>
                    <th>Category</th>
                    <th>HSN / SAC</th>
                    <th>GST Slab</th>
                    <th>Wholesale Price</th>
                    <th>MRP</th>
                    <th>Pack / Unit</th>
                    <th className="text-center">Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, idx) => {
                    const audit = validateProductRow(p, idx, catalogProducts);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={p.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=80&auto=format&fit=crop&q=60'}
                              alt={p.name}
                              className="rounded-2 border flex-shrink-0"
                              style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=80&auto=format&fit=crop&q=60';
                              }}
                            />
                            <div>
                              <div
                                className="fw-bold text-dark text-truncate"
                                style={{ maxWidth: '240px', cursor: 'pointer' }}
                                onClick={() => onSelectProductDetails(p)}
                                title="Click to view specification sheet"
                              >
                                {p.name}
                              </div>
                              <div className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                                SKU: {p.sku || 'N/A'} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{p.category}</span>
                        </td>
                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace">
                            {p.hsn || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                            {p.gstRate !== undefined ? `${p.gstRate}%` : '18%'}
                          </span>
                        </td>
                        <td className="fw-bold text-dark font-monospace">
                          ₹{(p.wholesalePrice || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-muted font-monospace">
                          ₹{(p.mrp || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <div className="fw-medium">{p.unit || 'PCS'}</div>
                          <small className="text-muted" style={{ fontSize: '10.5px' }}>
                            {p.packSize || '1 Pc'}
                          </small>
                        </td>
                        <td className="text-center">
                          {audit.status === 'valid' ? (
                            <span className="badge bg-success bg-opacity-10 text-success" title="All tax & logistics specs valid">
                              ✓ Valid
                            </span>
                          ) : audit.status === 'warning' ? (
                            <span className="badge bg-warning bg-opacity-20 text-warning" title={audit.warnings.join(', ')}>
                              ⚠️ Warning
                            </span>
                          ) : (
                            <span className="badge bg-danger bg-opacity-10 text-danger" title={audit.errors.join(', ')}>
                              ✕ Error
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary py-0 px-2"
                              onClick={() => handleEditProductClick(p)}
                              title="Edit product"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger py-0 px-2"
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Delete product"
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
          )}
        </div>
      ) : null}

      {/* MODAL 1: Create New Catalog */}
      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  Create New Manufacturer Catalog
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={handleCreateCatalog}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Catalog Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Master Industrial Tools Price List 2026"
                      value={newCatForm.name}
                      onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Initial Version</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="v1.0.0"
                        value={newCatForm.version}
                        onChange={(e) => setNewCatForm({ ...newCatForm, version: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Effective Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newCatForm.effectiveDate}
                        onChange={(e) => setNewCatForm({ ...newCatForm, effectiveDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Industry Segment</label>
                    <select
                      className="form-select"
                      value={newCatForm.category}
                      onChange={(e) => setNewCatForm({ ...newCatForm, category: e.target.value })}
                    >
                      <option value="Electrical & Electronics">Electrical &amp; Electronics</option>
                      <option value="FMCG & Consumer Goods">FMCG &amp; Consumer Goods</option>
                      <option value="Plumbing & Building Materials">Plumbing &amp; Building Materials</option>
                      <option value="Pharmaceuticals & Healthcare">Pharmaceuticals &amp; Healthcare</option>
                      <option value="Building & Construction">Building &amp; Construction</option>
                      <option value="Hardware & Industrial Tools">Hardware &amp; Industrial Tools</option>
                      <option value="Apparel & Garments">Apparel &amp; Garments</option>
                      <option value="Automotive Parts">Automotive Parts</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Sharing Permissions</label>
                    <select
                      className="form-select"
                      value={newCatForm.sharingMode}
                      onChange={(e) => setNewCatForm({ ...newCatForm, sharingMode: e.target.value })}
                    >
                      <option value="connection_only">Connection-Only (Approved Partners Only)</option>
                      <option value="public">Public (Visible across TREAD Product Network)</option>
                      <option value="restricted">Restricted (Invitation only)</option>
                    </select>
                  </div>
                  <div className="mb-0">
                    <label className="form-label small fw-semibold text-muted">Description &amp; Terms</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Brief notes, minimum order values, or warranty terms..."
                      value={newCatForm.description}
                      onChange={(e) => setNewCatForm({ ...newCatForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold px-4">
                    Create Catalog
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Product */}
      {showAddProductModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  {editingProductId ? 'Edit Product Details' : 'Add Product to Catalog'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setEditingProductId(null);
                  }}
                />
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-muted">Product Name / Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Havells Crabtree Verona 16A Modular Socket"
                        value={prodForm.name}
                        onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Category</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Modular Switches"
                        value={prodForm.category}
                        onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">SKU (Stock Keeping Unit)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. HVL-VR-16S-W"
                        value={prodForm.sku}
                        onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Barcode (EAN / UPC / GTIN)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. 8901765012358"
                        value={prodForm.barcode}
                        onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">HSN Code *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. 8536"
                        value={prodForm.hsn}
                        onChange={(e) => setProdForm({ ...prodForm, hsn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">GST Rate Slab (%)</label>
                      <select
                        className="form-select font-monospace"
                        value={prodForm.gstRate}
                        onChange={(e) => setProdForm({ ...prodForm, gstRate: Number(e.target.value) })}
                      >
                        {STANDARD_GST_RATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}% GST
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Billing Unit</label>
                      <select
                        className="form-select font-monospace"
                        value={prodForm.unit}
                        onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                      >
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="BOX">BOX (Boxes)</option>
                        <option value="KGS">KGS (Kilograms)</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="COIL">COIL (Coils)</option>
                        <option value="BTL">BTL (Bottles)</option>
                        <option value="JAR">JAR (Jars)</option>
                        <option value="PKT">PKT (Packets)</option>
                        <option value="SET">SET (Sets)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Wholesale Rate (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control font-monospace fw-bold"
                        placeholder="0.00"
                        value={prodForm.wholesalePrice}
                        onChange={(e) => setProdForm({ ...prodForm, wholesalePrice: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Maximum Retail Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control font-monospace"
                        placeholder="0.00"
                        value={prodForm.mrp}
                        onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Pack Packaging</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 20 Pcs / Box"
                        value={prodForm.packSize}
                        onChange={(e) => setProdForm({ ...prodForm, packSize: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Product Image URL</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        value={prodForm.imageUrl}
                        onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Technical Parameters / Specs</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 240V AC, Polycarbonate, 10kA"
                        value={prodForm.specs}
                        onChange={(e) => setProdForm({ ...prodForm, specs: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Marketing description, certifications, warranty..."
                        value={prodForm.description}
                        onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowAddProductModal(false);
                      setEditingProductId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold px-4">
                    {editingProductId ? 'Update Product' : 'Add to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Publish Version */}
      {showPublishModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-success text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  🚀 Publish Catalog Version Release
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPublishModal(false)} />
              </div>
              <form onSubmit={handlePublishVersionSubmit}>
                <div className="modal-body p-4">
                  <p className="small text-muted mb-3">
                    Publishing a new catalog version will make it accessible to authorized distributors and log a version update in their <strong>Catalog Updates</strong> dashboard.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Version Number *</label>
                    <input
                      type="text"
                      className="form-control font-monospace fw-bold"
                      placeholder="e.g. v2.1.0"
                      value={publishForm.newVersion}
                      onChange={(e) => setPublishForm({ ...publishForm, newVersion: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Effective Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={publishForm.effectiveDate}
                      onChange={(e) => setPublishForm({ ...publishForm, effectiveDate: e.target.value })}
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label small fw-semibold text-muted">Release Notes / Changelog *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Revised wholesale rates on switches by 5%, added 2 new LED batten models..."
                      value={publishForm.changeNotes}
                      onChange={(e) => setPublishForm({ ...publishForm, changeNotes: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPublishModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold px-4">
                    Confirm &amp; Publish
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Pre-Publish Validation Audit Review */}
      {showValidationReviewModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">🛡️</span>
                  <h5 className="modal-title fw-bold mb-0" style={{ fontSize: '16px' }}>
                    Catalog Quality &amp; GST Compliance Audit
                  </h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowValidationReviewModal(false)} />
              </div>
              <div className="modal-body p-4 bg-light">
                {/* Stats Summary */}
                <div className="row g-3 mb-3 text-center">
                  <div className="col-4">
                    <div className="p-3 bg-white rounded-3 shadow-xs border">
                      <div className="fs-4 fw-bold text-success font-monospace">{validationSummary.valid}</div>
                      <span className="small text-muted">Valid Items</span>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-white rounded-3 shadow-xs border">
                      <div className="fs-4 fw-bold text-warning font-monospace">{validationSummary.warnings}</div>
                      <span className="small text-muted">Warnings (Review Recommended)</span>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-white rounded-3 shadow-xs border">
                      <div className="fs-4 fw-bold text-danger font-monospace">{validationSummary.errors}</div>
                      <span className="small text-muted">Blocking Errors</span>
                    </div>
                  </div>
                </div>

                {validationSummary.issues.length === 0 ? (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                    <span>✓</span>
                    <span>All products in this catalog meet GST and Indian tariff validation requirements!</span>
                  </div>
                ) : (
                  <div className="card border-0 rounded-3 shadow-sm bg-white p-3">
                    <h6 className="fw-bold small text-muted text-uppercase mb-2">Detected Validation Items</h6>
                    <div className="list-group list-group-flush small" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {validationSummary.issues.map(({ product, type, messages }, idx) => (
                        <div key={idx} className="list-group-item px-0 py-2 border-bottom">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold text-dark">{product.name}</span>
                            <span className={`badge ${type === 'error' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                              {type.toUpperCase()}
                            </span>
                          </div>
                          <ul className="mb-0 ps-3 text-muted">
                            {messages.map((m, mIdx) => (
                              <li key={mIdx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-white px-4 py-3 d-flex justify-content-end">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setShowValidationReviewModal(false)}>
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Sharing & Permissions */}
      {showShareModal && activeCatalog && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white px-4 py-3">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>
                  👥 Catalog Sharing &amp; Access Permissions
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowShareModal(false)} />
              </div>
              <div className="modal-body p-4">
                <p className="small text-muted mb-3">
                  Control which distributors and retailers are permitted to discover, view wholesale pricing, and import products from <strong>{activeCatalog.name}</strong>.
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Sharing Mode</label>
                  <select
                    className="form-select"
                    value={activeCatalog.sharingMode}
                    onChange={(e) => {
                      const updated = catalogs.map((c) =>
                        c.id === activeCatalog.id ? { ...c, sharingMode: e.target.value } : c
                      );
                      onSaveCatalogs(updated);
                    }}
                  >
                    <option value="connection_only">Connection-Only (Only approved connected businesses)</option>
                    <option value="public">Public (Visible across entire TREAD network)</option>
                    <option value="restricted">Restricted (Invitation only)</option>
                  </select>
                </div>
                <div className="p-3 bg-light rounded-3 border">
                  <div className="small fw-semibold text-dark mb-1">Connected Distributors with Access</div>
                  <div className="small text-muted mb-2">
                    Distributors who have an approved connection automatically receive access to this catalog.
                  </div>
                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                    {manufacturers.filter((m) => m.connectionStatus === 'approved').length} Active Network Connections
                  </span>
                </div>
              </div>
              <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-end">
                <button type="button" className="btn btn-primary px-4" onClick={() => setShowShareModal(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
