import { useMemo } from 'react';

export default function ProductDetailModal({
  product,
  onClose,
  onImportToInventory,
  isImported = false,
  isManufacturerView = false,
}) {
  if (!product) return null;

  const specsList = useMemo(() => {
    if (!product.specs) return [];
    if (typeof product.specs === 'object') {
      return Object.entries(product.specs).map(([key, val]) => ({ key, val: String(val) }));
    }
    return [];
  }, [product.specs]);

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(9, 13, 22, 0.75)', zIndex: 1250 }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div
            className="modal-header text-white px-4 py-3"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5">🌐</span>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-white" style={{ fontSize: '17px' }}>
                  Product Specification Sheet
                </h5>
                <span className="small text-white-50">
                  {product.manufacturerName || 'Verified Manufacturer'} &bull; Catalog {product.catalogVersion || 'v1.0'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light">
            <div className="row g-4">
              {/* Left Column: Image & Quick Badges */}
              <div className="col-md-5">
                <div
                  className="card border-0 rounded-3 shadow-sm overflow-hidden mb-3 text-center bg-white"
                  style={{ minHeight: '220px', position: 'relative' }}
                >
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60'}
                    alt={product.name}
                    className="img-fluid w-100"
                    style={{ height: '220px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      zIndex: 2,
                    }}
                  >
                    <span className="badge bg-dark bg-opacity-75 text-warning px-2 py-1 font-monospace" style={{ fontSize: '11px' }}>
                      SKU: {product.sku || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Tax & Logistics Badges */}
                <div className="p-3 bg-white rounded-3 shadow-sm border border-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted fw-semibold">HSN / SAC Code:</span>
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace px-2 py-1">
                      {product.hsn || 'Not specified'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted fw-semibold">GST Rate Slab:</span>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                      {product.gstRate !== undefined ? `${product.gstRate}% GST` : '18% GST'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted fw-semibold">Billing Unit:</span>
                    <span className="fw-bold text-dark font-monospace">{product.unit || 'PCS'}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted fw-semibold">Pack Packaging:</span>
                    <span className="small text-dark fw-medium">{product.packSize || 'Standard Single'}</span>
                  </div>
                  {product.barcode && (
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted fw-semibold">Barcode / EAN:</span>
                      <span className="small font-monospace text-secondary">{product.barcode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Pricing & Specifications */}
              <div className="col-md-7">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
                    {product.category || 'General'}
                  </span>
                  <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                    Verified Manufacturer Item
                  </span>
                </div>

                <h4 className="fw-bold text-dark mb-2" style={{ lineHeight: '1.3' }}>
                  {product.name}
                </h4>

                <p className="text-muted small mb-3" style={{ lineHeight: '1.5' }}>
                  {product.description || 'Certified manufacturer specification sheet with approved GST tax schedule and verified packaging standards.'}
                </p>

                {/* Pricing Box */}
                <div
                  className="card border-0 rounded-3 p-3 mb-3 text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                >
                  <div className="row g-2 text-center">
                    <div className="col-6 border-end border-white border-opacity-10">
                      <div className="small text-white-50 text-uppercase" style={{ fontSize: '11px' }}>
                        Wholesale Rate
                      </div>
                      <div className="fs-4 fw-bold text-warning font-monospace">
                        ₹{(product.wholesalePrice || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="small text-white-50" style={{ fontSize: '10px' }}>
                        Per {product.unit || 'PCS'} + GST
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="small text-white-50 text-uppercase" style={{ fontSize: '11px' }}>
                        Maximum Retail (MRP)
                      </div>
                      <div className="fs-4 fw-bold text-white font-monospace">
                        ₹{(product.mrp || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="small text-white-50" style={{ fontSize: '10px' }}>
                        Incl. all taxes
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Specs Table */}
                {specsList.length > 0 && (
                  <div className="bg-white rounded-3 shadow-sm border border-light p-3 mb-3">
                    <h6 className="fw-bold small text-muted text-uppercase mb-2" style={{ letterSpacing: '0.04em' }}>
                      Manufacturer Technical Parameters
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-striped mb-0 small">
                        <tbody>
                          {specsList.map(({ key, val }) => (
                            <tr key={key}>
                              <td className="text-muted fw-medium py-1" style={{ width: '45%' }}>
                                {key}
                              </td>
                              <td className="fw-semibold text-dark py-1">{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Manufacturer Credential Card */}
                <div className="p-3 bg-white rounded-3 shadow-sm border border-light d-flex align-items-center justify-content-between">
                  <div>
                    <div className="small text-muted">Authorized Brand</div>
                    <div className="fw-bold text-dark">{product.manufacturerName || 'Verified Partner'}</div>
                  </div>
                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                    ✓ Verified Network Partner
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-white px-4 py-3 d-flex justify-content-between align-items-center border-top">
            <button type="button" className="btn btn-outline-secondary px-4" onClick={onClose}>
              Close Window
            </button>
            {!isManufacturerView && onImportToInventory && (
              <button
                type="button"
                className={`btn ${isImported ? 'btn-outline-success disabled' : 'btn-primary'} px-4 py-2 fw-semibold d-flex align-items-center gap-2`}
                onClick={() => {
                  if (!isImported) {
                    onImportToInventory(product);
                    onClose();
                  }
                }}
              >
                <span>{isImported ? '✓ Already in Inventory' : '📥 Import to My Inventory'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
