import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

function PurchaseImportFile({ onConfirmImport, onCancel }) {
  const [vendorName, setVendorName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [previewItems, setPreviewItems] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text !== 'string') return;

      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const rows = parsed.map((row) => ({
              id: uuidv4(),
              description: row.name || row.description || row.itemName || 'Imported Product',
              hsn: row.hsn || row.hsnCode || '',
              quantity: Math.max(1, Number(row.stock || row.quantity || row.qty || 1)),
              rate: Math.max(0, Number(row.rate || row.price || row.unitPrice || 0)),
              gstPercent: Number(row.gst || row.gstPercent || row.taxRate || 18),
              unit: row.unit || 'PCS',
            }));
            setPreviewItems(rows);
          }
        } else {
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length <= 1) {
            alert('File is empty or missing data rows.');
            return;
          }

          const firstLine = lines[0].toLowerCase();
          const startIdx =
            firstLine.includes('item') ||
            firstLine.includes('description') ||
            firstLine.includes('name')
              ? 1
              : 0;

          const parsed = [];
          for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
            if (cols.length >= 1 && cols[0]) {
              parsed.push({
                id: uuidv4(),
                description: cols[0] || 'Product Item',
                hsn: cols[1] || '',
                quantity: Math.max(1, Number(cols[2]) || 1),
                rate: Math.max(0, Number(cols[3]) || 0),
                gstPercent: Number(cols[4]) || 18,
                unit: cols[5] || 'PCS',
              });
            }
          }

          if (parsed.length > 0) {
            setPreviewItems(parsed);
          } else {
            alert('Could not find valid item rows in this file.');
          }
        }
      } catch (err) {
        alert('Failed to parse file: ' + err.message);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleTemplate = () => {
    const sample = `Item Description,HSN Code,Quantity Purchased,Unit Purchase Rate,GST Slab,Unit
LED Light Bulb 9W,8539,50,95,18,PCS
USB-C Fast Charger 65W,8504,25,380,18,PCS
Wireless Optical Mouse,8471,20,290,18,NOS
A4 Copier Paper 75GSM,4802,80,240,12,BOX
HDMI Cable 2M High Speed,8544,30,160,18,PCS`;

    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Purchase_Bill_Stock_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    if (previewItems.length === 0) {
      alert('Please upload a file with items first.');
      return;
    }

    onConfirmImport({
      vendorName: vendorName.trim() || 'Direct Import Supplier',
      billNumber: billNumber.trim() || `PB-IMP-${Date.now().toString().slice(-4)}`,
      billDate,
      items: previewItems,
    });
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white py-3">
        <h2 className="h5 mb-0 fw-bold">📥 Import Stock from Purchase Bill (Excel / CSV)</h2>
        <small className="text-muted">
          Upload an Excel spreadsheet or CSV invoice file to inward items into inventory in bulk.
        </small>
      </div>

      <div className="card-body p-4">
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <h3 className="h6 fw-bold text-primary mb-3">Step 1: Supplier & Bill Info</h3>
            <div className="mb-3">
              <label className="form-label fw-semibold">Supplier / Vendor Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. National Distributors Pvt Ltd"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label fw-semibold">Purchase Bill No.</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. INV-99234"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                />
              </div>
              <div className="col-6">
                <label className="form-label fw-semibold">Bill Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="fw-semibold mb-1">📄 Expected Column Format:</div>
              <code className="small d-block text-secondary">
                Item Description, HSN Code, Quantity Purchased, Unit Purchase Rate, GST Slab, Unit
              </code>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={downloadSampleTemplate}
            >
              📥 Download Sample Template (.csv)
            </button>
          </div>

          <div className="col-lg-6 d-flex flex-column justify-content-center">
            <div className="border border-2 border-dashed rounded-4 p-5 text-center bg-light">
              <div className="fs-1 mb-2">📊</div>
              <h4 className="h6 fw-bold mb-2">Upload Purchase Bill File</h4>
              <p className="text-muted small mb-4">
                Supports Excel (.xlsx / .xls), CSV (.csv), or JSON.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls,.json,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-primary px-4 py-2 fw-bold shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                📂 Browse & Upload Spreadsheet
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Table */}
        {previewItems.length > 0 && (
          <div className="border rounded-3 p-3 bg-white mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="h6 fw-bold mb-0 text-success">
                ✓ Parsed {previewItems.length} Line Item(s) from File
              </h3>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => setPreviewItems([])}
              >
                Clear
              </button>
            </div>

            <div className="table-responsive mb-3" style={{ maxHeight: '300px' }}>
              <table className="table table-sm table-bordered align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Item Description</th>
                    <th>HSN</th>
                    <th className="text-end">Qty Inward</th>
                    <th className="text-end">Rate (₹)</th>
                    <th className="text-center">GST %</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td className="fw-semibold">{item.description}</td>
                      <td>{item.hsn || '—'}</td>
                      <td className="text-end fw-bold text-success">+{item.quantity}</td>
                      <td className="text-end">₹{item.rate}</td>
                      <td className="text-center">{item.gstPercent}%</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end gap-2">
              {onCancel && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="btn btn-success fw-bold px-4 shadow-sm"
                onClick={handleConfirm}
              >
                ✓ Confirm & Inward {previewItems.length} Items into Inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseImportFile;
