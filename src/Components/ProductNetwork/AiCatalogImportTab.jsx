import { useState, useRef } from 'react';
import {
  parseCatalogFile,
  generateSampleFile,
  exportErrorReportCsv,
  validateProductRow,
  STANDARD_GST_RATES,
} from '../../services/productNetworkService.js';

export default function AiCatalogImportTab({
  catalogs = [],
  onImportToTreadStock,
  onImportToCatalog,
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [editableRows, setEditableRows] = useState([]);
  const [importTarget, setImportTarget] = useState('inventory'); // 'inventory' | 'catalog'
  const [selectedCatalogId, setSelectedCatalogId] = useState(catalogs[0]?.id || '');
  const [filterAuditStatus, setFilterAuditStatus] = useState('all'); // 'all' | 'error' | 'warning' | 'valid'

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const parsed = await parseCatalogFile(file);
      setParseResult(parsed);
      setEditableRows(parsed.rows);
    } catch (err) {
      alert(`Error parsing catalog file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Inline cell edit handler
  const handleCellEdit = (rowIndex, field, value) => {
    setEditableRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[rowIndex], [field]: value };
      // Re-run validation audit on edited row
      target._audit = validateProductRow(target, rowIndex, updated);
      updated[rowIndex] = target;
      return updated;
    });
  };


  // Filtered rows for the preview table
  const filteredRows = editableRows.filter((r) => {
    if (filterAuditStatus === 'all') return true;
    return r._audit.status === filterAuditStatus;
  });

  // Calculate live audit statistics
  const liveStats = {
    total: editableRows.length,
    valid: editableRows.filter((r) => r._audit.status === 'valid').length,
    warning: editableRows.filter((r) => r._audit.status === 'warning').length,
    error: editableRows.filter((r) => r._audit.status === 'error').length,
  };

  // Final Execute Import
  const handleExecuteImport = () => {
    if (editableRows.length === 0) return;

    if (liveStats.error > 0) {
      alert(`Please correct the ${liveStats.error} error rows marked in red before finalizing the import.`);
      return;
    }

    if (importTarget === 'inventory') {
      onImportToTreadStock(editableRows);
      alert(`✓ Successfully imported ${editableRows.length} standardized products into TREAD stock inventory!`);
    } else {
      if (!selectedCatalogId) {
        alert('Please select a target manufacturer catalog.');
        return;
      }
      onImportToCatalog(selectedCatalogId, editableRows);
      alert(`✓ Successfully imported ${editableRows.length} products into the selected catalog!`);
    }

    // Reset view
    setParseResult(null);
    setEditableRows([]);
  };

  return (
    <div className="ai-catalog-import-tab">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            ⚡ AI-Powered Catalog &amp; Price List Importer
          </h4>
          <span className="small text-muted">
            Intelligent column matching, GST HSN code validation, duplicate detection, and non-destructive stock integration.
          </span>
        </div>

        {/* Sample Download Shortcuts */}
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => generateSampleFile('xlsx')}
            title="Download ready-to-test Excel catalog"
          >
            📥 Sample Excel (.xlsx)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => generateSampleFile('csv')}
            title="Download ready-to-test CSV catalog"
          >
            📥 Sample CSV (.csv)
          </button>
        </div>
      </div>

      {!parseResult ? (
        /* Dropzone Card */
        <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
          <div
            className={`border-2 border-dashed rounded-4 p-5 text-center transition-all ${
              dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary border-opacity-25 bg-light'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{ cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="d-none"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="mb-3">
              <span className="fs-1">📊</span>
            </div>

            <h5 className="fw-bold text-dark mb-1">
              Drag &amp; Drop Your Catalog File Here, or Click to Browse
            </h5>
            <p className="text-muted small mb-3">
              Supports Microsoft Excel (<strong>.xlsx, .xls</strong>) and Comma-Separated Values (<strong>.csv</strong>)
            </p>

            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold shadow-sm"
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Parsing Workbook...' : 'Select File from Computer'}
            </button>
          </div>

          {/* AI Features Checklist */}
          <div className="row g-3 mt-4 pt-3 border-top">
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <span className="text-primary fw-bold">✓</span>
                <div className="small">
                  <strong>Smart Header Recognition:</strong> Auto-maps varied column labels to standard product fields.
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <span className="text-success fw-bold">✓</span>
                <div className="small">
                  <strong>HSN &amp; Tax Auditing:</strong> Flags questionable HSN codes and irregular GST rate percentages.
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <span className="text-warning fw-bold">✓</span>
                <div className="small">
                  <strong>Duplicate Safeguard:</strong> Detects conflicting SKUs or barcodes within the file and local stock.
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <span className="text-info fw-bold">✓</span>
                <div className="small">
                  <strong>Non-Destructive:</strong> Existing stock quantities and custom prices are strictly preserved.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview, Inline Corrections & Execution View */
        <div className="catalog-preview-workspace">
          {/* Quality Summary Banner */}
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-success">PARSED SUCCESSFULLY</span>
                  <h5 className="fw-bold mb-0 text-dark">
                    Catalog File Preview &amp; Pre-Import Audit
                  </h5>
                </div>
                <span className="small text-muted">
                  Sheet: <strong>{parseResult.activeSheet}</strong> &bull; Total Rows: <strong>{liveStats.total}</strong>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                  onClick={() => exportErrorReportCsv(editableRows)}
                >
                  <span>📋</span>
                  <span>Export Error Report (CSV)</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setParseResult(null);
                    setEditableRows([]);
                  }}
                >
                  Upload Different File
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-bold px-3 shadow-sm d-flex align-items-center gap-1"
                  onClick={handleExecuteImport}
                  disabled={liveStats.error > 0}
                >
                  <span>🚀</span>
                  <span>Finalize &amp; Import Products ({liveStats.total})</span>
                </button>
              </div>
            </div>

            {/* Target Selector */}
            <div className="row g-3 mt-3 pt-3 border-top align-items-center">
              <div className="col-md-6 col-lg-4">
                <label className="form-label small fw-semibold text-muted mb-1">Import Destination</label>
                <select
                  className="form-select form-select-sm"
                  value={importTarget}
                  onChange={(e) => setImportTarget(e.target.value)}
                >
                  <option value="inventory">Local TREAD Stock Inventory (Ready for Billing)</option>
                  <option value="catalog">Manufacturer Catalog (Product Network)</option>
                </select>
              </div>

              {importTarget === 'catalog' && (
                <div className="col-md-6 col-lg-4">
                  <label className="form-label small fw-semibold text-muted mb-1">Target Manufacturer Catalog</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedCatalogId}
                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                  >
                    {catalogs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.version})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter Row Status */}
              <div className="col-md-6 col-lg-4 ms-auto text-end">
                <label className="form-label small fw-semibold text-muted mb-1 d-block">Filter Review Status</label>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${filterAuditStatus === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterAuditStatus('all')}
                  >
                    All ({liveStats.total})
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterAuditStatus === 'error' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setFilterAuditStatus('error')}
                  >
                    Errors ({liveStats.error})
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterAuditStatus === 'warning' ? 'btn-warning text-dark' : 'btn-outline-warning'}`}
                    onClick={() => setFilterAuditStatus('warning')}
                  >
                    Review ({liveStats.warning})
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterAuditStatus === 'valid' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setFilterAuditStatus('valid')}
                  >
                    Valid ({liveStats.valid})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Editable Preview Table */}
          <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden mb-4">
            <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
              <span className="small text-muted">
                💡 <strong>Tip:</strong> You can edit any cell directly in the table to fix missing HSN codes, correct GST rates, or adjust wholesale prices before importing.
              </span>
              <span className="small fw-semibold text-dark">
                Showing {filteredRows.length} rows
              </span>
            </div>

            <div className="table-responsive" style={{ maxHeight: '550px' }}>
              <table className="table table-hover table-sm align-middle mb-0 small">
                <thead className="table-light text-muted fw-semibold sticky-top">
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th style={{ minWidth: '220px' }}>Product Title *</th>
                    <th style={{ minWidth: '130px' }}>SKU Code</th>
                    <th style={{ minWidth: '130px' }}>Barcode</th>
                    <th style={{ minWidth: '100px' }}>HSN *</th>
                    <th style={{ minWidth: '110px' }}>GST Rate</th>
                    <th style={{ minWidth: '110px' }}>Wholesale (₹)</th>
                    <th style={{ minWidth: '110px' }}>MRP (₹)</th>
                    <th style={{ minWidth: '90px' }}>Unit</th>
                    <th style={{ minWidth: '120px' }}>Pack Size</th>
                    <th style={{ minWidth: '140px' }}>Validation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const idx = r._rawIndex;
                    const audit = r._audit;

                    return (
                      <tr
                        key={idx}
                        className={
                          audit.status === 'error'
                            ? 'table-danger'
                            : audit.status === 'warning'
                            ? 'table-warning'
                            : ''
                        }
                      >
                        <td className="text-muted font-monospace">{idx + 1}</td>

                        {/* Editable Name */}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent fw-semibold"
                            value={r.name}
                            onChange={(e) => handleCellEdit(idx, 'name', e.target.value)}
                            placeholder="Enter Product Name"
                          />
                        </td>

                        {/* Editable SKU */}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent font-monospace"
                            value={r.sku}
                            onChange={(e) => handleCellEdit(idx, 'sku', e.target.value)}
                            placeholder="SKU Code"
                          />
                        </td>

                        {/* Editable Barcode */}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent font-monospace"
                            value={r.barcode}
                            onChange={(e) => handleCellEdit(idx, 'barcode', e.target.value)}
                            placeholder="Barcode"
                          />
                        </td>

                        {/* Editable HSN */}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent font-monospace fw-bold"
                            value={r.hsn}
                            onChange={(e) => handleCellEdit(idx, 'hsn', e.target.value)}
                            placeholder="4-8 digits"
                          />
                        </td>

                        {/* Editable GST Rate */}
                        <td>
                          <select
                            className="form-select form-select-sm border-0 bg-transparent font-monospace"
                            value={r.gstRate}
                            onChange={(e) => handleCellEdit(idx, 'gstRate', Number(e.target.value))}
                          >
                            {STANDARD_GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Editable Wholesale */}
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm border-0 bg-transparent font-monospace fw-bold"
                            value={r.wholesalePrice}
                            onChange={(e) => handleCellEdit(idx, 'wholesalePrice', Number(e.target.value))}
                          />
                        </td>

                        {/* Editable MRP */}
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm border-0 bg-transparent font-monospace text-muted"
                            value={r.mrp}
                            onChange={(e) => handleCellEdit(idx, 'mrp', Number(e.target.value))}
                          />
                        </td>

                        {/* Editable Unit */}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent font-monospace"
                            value={r.unit}
                            onChange={(e) => handleCellEdit(idx, 'unit', e.target.value.toUpperCase())}
                          />
                        </td>

                        {/* Editable Pack Size */}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent"
                            value={r.packSize}
                            onChange={(e) => handleCellEdit(idx, 'packSize', e.target.value)}
                          />
                        </td>

                        {/* Validation Status & Quick Tooltip */}
                        <td>
                          {audit.status === 'valid' ? (
                            <span className="badge bg-success bg-opacity-10 text-success">
                              ✓ Valid
                            </span>
                          ) : audit.status === 'warning' ? (
                            <span
                              className="badge bg-warning bg-opacity-25 text-dark"
                              title={audit.warnings.join(' | ')}
                            >
                              ⚠️ {audit.warnings[0]}
                            </span>
                          ) : (
                            <span
                              className="badge bg-danger bg-opacity-15 text-danger fw-bold"
                              title={audit.errors.join(' | ')}
                            >
                              ✕ {audit.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
