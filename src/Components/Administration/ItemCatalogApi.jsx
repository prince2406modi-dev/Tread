import { useState, useMemo, useDeferredValue } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GST_UNITS, DEFAULT_UNIT } from '../../constants/units.js';
import { validateHSN, COMMON_HSN_SAC_CODES } from '../../services/hsnValidator.js';

const EMPTY_ITEM_FORM = {
  name: '',
  hsn: '',
  unit: DEFAULT_UNIT,
  rate: '',
  purchaseRate: '',
  gst: 18,
  stock: 10,
  minStockAlert: 5,
  sku: '',
  notes: '',
};

const DEFAULT_SAMPLE_PAYLOAD = JSON.stringify(
  {
    name: 'Dell Pro Wireless Mouse WM126',
    hsn: '8471',
    unit: 'PCS',
    rate: 899,
    purchaseRate: 650,
    gst: 18,
    stock: 25,
    minStockAlert: 5,
    sku: 'DELL-WM126-BLK',
    notes: 'Optical wireless mouse with nano USB receiver',
  },
  null,
  2
);

function ItemCatalogApi({
  stockItems = [],
  onSaveStock,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('add-item'); // 'add-item' | 'api-docs' | 'catalog-list' | 'bulk-json'
  const [items, setItems] = useState(stockItems);
  const [form, setForm] = useState(EMPTY_ITEM_FORM);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  // API Tester State
  const [apiEndpoint, setApiEndpoint] = useState('https://api.tread-erp.com/v1/items');
  const [apiMethod, setApiMethod] = useState('POST');
  const [apiKey, setApiKey] = useState(() => {
    return 'tr_live_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  });
  const [jsonPayload, setJsonPayload] = useState(DEFAULT_SAMPLE_PAYLOAD);
  const [apiResponse, setApiResponse] = useState(null);
  const [isExecutingApi, setIsExecutingApi] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('curl'); // 'curl' | 'javascript' | 'python' | 'nodejs'
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Bulk JSON state
  const [bulkJsonInput, setBulkJsonInput] = useState('');
  const [bulkImportStatus, setBulkImportStatus] = useState(null);

  const formHsnAnalysis = useMemo(() => {
    if (!form.hsn || !form.hsn.trim()) return null;
    return validateHSN(form.hsn);
  }, [form.hsn]);

  const updateCatalog = (newItems) => {
    setItems(newItems);
    if (onSaveStock) onSaveStock(newItems);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter an item name.');
      return;
    }

    const newItem = {
      id: editingId || uuidv4(),
      name: form.name.trim(),
      hsn: form.hsn?.trim() || '',
      unit: form.unit || DEFAULT_UNIT,
      rate: Math.max(0, Number(form.rate) || 0),
      purchaseRate: Math.max(0, Number(form.purchaseRate) || 0),
      gst: Number(form.gst) || 18,
      stock: Math.max(0, Number(form.stock) || 0),
      minStockAlert: Math.max(0, Number(form.minStockAlert) || 5),
      sku: form.sku?.trim() || '',
      notes: form.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updated;
    if (editingId) {
      updated = items.map((i) => (i.id === editingId ? newItem : i));
      alert(`✓ Product "${newItem.name}" updated successfully in master catalog!`);
    } else {
      updated = [newItem, ...items];
      alert(`✓ Product "${newItem.name}" created successfully in master catalog!`);
    }

    updateCatalog(updated);
    setForm(EMPTY_ITEM_FORM);
    setEditingId(null);
    setActiveTab('catalog-list');
  };

  const handleEditItem = (item) => {
    setForm({
      name: item.name || '',
      hsn: item.hsn || '',
      unit: item.unit || DEFAULT_UNIT,
      rate: item.rate !== undefined ? item.rate : '',
      purchaseRate: item.purchaseRate !== undefined ? item.purchaseRate : '',
      gst: item.gst !== undefined ? item.gst : 18,
      stock: item.stock !== undefined ? item.stock : 10,
      minStockAlert: item.minStockAlert !== undefined ? item.minStockAlert : 5,
      sku: item.sku || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setActiveTab('add-item');
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to remove this item from the master catalog?')) {
      const updated = items.filter((i) => i.id !== id);
      updateCatalog(updated);
    }
  };

  // API Execution Simulator
  const handleExecuteApiRequest = () => {
    setIsExecutingApi(true);
    setApiResponse(null);

    setTimeout(() => {
      try {
        const parsed = JSON.parse(jsonPayload);
        if (!parsed.name) {
          throw new Error("Validation Error: 'name' property is required.");
        }

        const createdItem = {
          id: uuidv4(),
          name: parsed.name,
          hsn: parsed.hsn || '',
          unit: parsed.unit || DEFAULT_UNIT,
          rate: Number(parsed.rate) || 0,
          purchaseRate: Number(parsed.purchaseRate) || 0,
          gst: Number(parsed.gst) || 18,
          stock: Number(parsed.stock) || 0,
          minStockAlert: Number(parsed.minStockAlert) || 5,
          sku: parsed.sku || '',
          notes: parsed.notes || '',
          createdAt: new Date().toISOString(),
          source: 'REST API',
        };

        const updated = [createdItem, ...items];
        updateCatalog(updated);

        setApiResponse({
          status: 201,
          statusText: 'Created',
          data: {
            success: true,
            message: 'Item created successfully via Tread Item API',
            item: createdItem,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        setApiResponse({
          status: 400,
          statusText: 'Bad Request',
          data: {
            success: false,
            error: err.message,
            timestamp: new Date().toISOString(),
          },
        });
      } finally {
        setIsExecutingApi(false);
      }
    }, 450);
  };

  // Bulk JSON Import
  const handleProcessBulkJson = () => {
    if (!bulkJsonInput.trim()) {
      alert('Please paste a JSON array of items.');
      return;
    }

    try {
      const parsed = JSON.parse(bulkJsonInput);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) throw new Error('No items found in JSON array.');

      const newItems = arr.map((row) => ({
        id: uuidv4(),
        name: row.name || row.description || 'Imported Item',
        hsn: row.hsn || row.hsnCode || '',
        unit: row.unit || DEFAULT_UNIT,
        rate: Number(row.rate || row.price) || 0,
        purchaseRate: Number(row.purchaseRate || row.cost) || 0,
        gst: Number(row.gst || row.gstPercent) || 18,
        stock: Number(row.stock || row.quantity) || 0,
        minStockAlert: Number(row.minStockAlert) || 5,
        sku: row.sku || '',
        notes: row.notes || '',
        createdAt: new Date().toISOString(),
        source: 'Bulk JSON API',
      }));

      const updated = [...newItems, ...items];
      updateCatalog(updated);
      setBulkImportStatus({
        success: true,
        count: newItems.length,
      });
      setBulkJsonInput('');
    } catch (err) {
      setBulkImportStatus({
        success: false,
        error: err.message,
      });
    }
  };

  // Filter items in catalog
  const filteredCatalog = useMemo(() => {
    if (!deferredSearch) return items;
    const q = deferredSearch.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.hsn && i.hsn.toLowerCase().includes(q)) ||
        (i.sku && i.sku.toLowerCase().includes(q))
    );
  }, [items, deferredSearch]);

  // Code Snippet Generator
  const codeSnippet = useMemo(() => {
    if (codeLanguage === 'curl') {
      return `curl -X POST "${apiEndpoint}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload.replace(/\n/g, '\n  ')}'`;
    }
    if (codeLanguage === 'javascript') {
      return `// JavaScript (Fetch API / Node.js)
const createMasterItem = async () => {
  const response = await fetch('${apiEndpoint}', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(${jsonPayload})
  });

  const data = await response.json();
  console.log('Item Created:', data);
};

createMasterItem();`;
    }
    if (codeLanguage === 'python') {
      return `# Python (requests library)
import requests

url = "${apiEndpoint}"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
payload = ${jsonPayload}

response = requests.post(url, json=payload, headers=headers)
print("Status:", response.status_code)
print("Response:", response.json())`;
    }
    if (codeLanguage === 'nodejs') {
      return `// Node.js (Axios)
const axios = require('axios');

axios.post('${apiEndpoint}', ${jsonPayload}, {
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
})
.then(res => console.log('Created SKU:', res.data))
.catch(err => console.error('API Error:', err.response?.data || err.message));`;
    }
    return '';
  }, [codeLanguage, apiEndpoint, apiKey, jsonPayload]);

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h3 fw-bold mb-0">📦 Master Item Catalog &amp; API Management</h1>
            <span className="badge bg-primary">Administration</span>
          </div>
          <p className="text-muted mb-0 mt-1">
            Create, configure master products with HSN codes, and integrate via REST/Cloud APIs.
          </p>
        </div>
        <div className="d-flex gap-2">
          {onBack && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
              ← Back to Admin
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm fw-bold"
            onClick={() => {
              setForm(EMPTY_ITEM_FORM);
              setEditingId(null);
              setActiveTab('add-item');
            }}
          >
            ＋ Add Master Item
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills nav-fill bg-white p-2 rounded-3 shadow-sm border mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'add-item' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-item')}
          >
            {editingId ? '✏️ Edit Master Item' : '＋ Add Master Item'}
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'api-docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-docs')}
          >
            🔌 Item REST API &amp; Webhook Tester
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'catalog-list' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog-list')}
          >
            📋 Master Items Directory ({items.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'bulk-json' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk-json')}
          >
            📥 Bulk JSON Import API
          </button>
        </li>
      </ul>

      {/* TAB 1: ADD / EDIT MASTER ITEM */}
      {activeTab === 'add-item' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-primary text-white py-3">
            <h2 className="h5 mb-0 fw-bold">
              {editingId ? '✏️ Modify Master Item Definition' : '＋ Add New Master Item / Product'}
            </h2>
            <small className="text-white-50">
              Configure SKU, Indian GST HSN/SAC code, selling rate, purchase cost, and stock alert levels.
            </small>
          </div>
          <div className="card-body p-4">
            <form onSubmit={handleSubmitForm}>
              <div className="row g-3 mb-3">
                <div className="col-md-8 col-12">
                  <label className="form-label fw-semibold">
                    Product / Item Description *
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Dell Pro Wireless Keyboard & Mouse Combo"
                    value={form.name}
                    onChange={handleFormChange}
                    autoFocus
                    required
                  />
                </div>
                <div className="col-md-4 col-12">
                  <label className="form-label fw-semibold">SKU / Barcode (optional)</label>
                  <input
                    type="text"
                    name="sku"
                    className="form-control font-monospace"
                    placeholder="e.g. DELL-KB-900"
                    value={form.sku}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">HSN / SAC Code (2, 4, 6, or 8 digits)</label>
                  <input
                    type="text"
                    name="hsn"
                    className={`form-control font-monospace ${
                      formHsnAnalysis
                        ? formHsnAnalysis.isValid
                          ? 'is-valid'
                          : 'is-invalid'
                        : ''
                    }`}
                    placeholder="e.g. 8471 (Goods) or 9983 (Services)"
                    maxLength={8}
                    value={form.hsn}
                    onChange={handleFormChange}
                    list="hsn-admin-datalist"
                  />
                  <datalist id="hsn-admin-datalist">
                    {COMMON_HSN_SAC_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name} ({c.gst}% GST)
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">Unit of Measurement (UQC)</label>
                  <select
                    name="unit"
                    className="form-select"
                    value={form.unit || DEFAULT_UNIT}
                    onChange={handleFormChange}
                  >
                    {GST_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time HSN Validation Feedback */}
              {formHsnAnalysis && (
                <div className="mb-3">
                  {formHsnAnalysis.isValid ? (
                    <div className="alert alert-success py-2 px-3 mb-0 small d-flex justify-content-between align-items-center">
                      <span>
                        ✓ <strong>Valid {formHsnAnalysis.type} [{formHsnAnalysis.length} digits]:</strong>{' '}
                        {formHsnAnalysis.description}
                      </span>
                      <span className="badge bg-success">GST Verified</span>
                    </div>
                  ) : (
                    <div className="alert alert-danger py-2 px-3 mb-0 small">
                      ⚠️ {formHsnAnalysis.errorMessage}
                    </div>
                  )}
                </div>
              )}

              <div className="row g-3 mb-3">
                <div className="col-md-3 col-6">
                  <label className="form-label fw-semibold">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="rate"
                    className="form-control text-end"
                    placeholder="0.00"
                    value={form.rate}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="col-md-3 col-6">
                  <label className="form-label fw-semibold">Purchase Cost Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="purchaseRate"
                    className="form-control text-end"
                    placeholder="0.00"
                    value={form.purchaseRate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="col-md-3 col-6">
                  <label className="form-label fw-semibold">GST Rate Slab</label>
                  <select
                    name="gst"
                    className="form-select"
                    value={form.gst}
                    onChange={handleFormChange}
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST (Luxury)</option>
                  </select>
                </div>

                <div className="col-md-3 col-6">
                  <label className="form-label fw-semibold">Opening Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    name="stock"
                    className="form-control text-end"
                    value={form.stock}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-4 col-12">
                  <label className="form-label fw-semibold">Low Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    name="minStockAlert"
                    className="form-control text-end"
                    placeholder="5"
                    value={form.minStockAlert}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="col-md-8 col-12">
                  <label className="form-label fw-semibold">Notes / Item Specifications</label>
                  <input
                    type="text"
                    name="notes"
                    className="form-control"
                    placeholder="e.g. 1 Year Manufacturer Warranty, Box packaging"
                    value={form.notes}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setForm(EMPTY_ITEM_FORM);
                      setEditingId(null);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="btn btn-primary px-4 fw-bold">
                  {editingId ? '💾 Save Changes' : '＋ Save to Master Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: REST & CLOUD API DOCUMENTATION & TESTER */}
      {activeTab === 'api-docs' && (
        <div className="row g-4">
          <div className="col-lg-6 col-12">
            {/* Interactive API Simulator Card */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h5 mb-0 fw-bold">⚡ Interactive Item Creation API Simulator</h2>
                  <small className="text-white-50">Test sending live payloads to the Tread Item API.</small>
                </div>
                <span className="badge bg-success">Live Engine</span>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">HTTP Method &amp; Endpoint URL</label>
                  <div className="input-group">
                    <select
                      className="form-select bg-light fw-bold"
                      style={{ maxWidth: '110px' }}
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold mb-0">API Bearer Token (Authorization)</label>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2 small"
                      onClick={() => {
                        const newKey = 'tr_live_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                        setApiKey(newKey);
                      }}
                    >
                      🔄 Regenerate Key
                    </button>
                  </div>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control font-monospace bg-light"
                      value={`Bearer ${apiKey}`}
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                    >
                      {copiedKey ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold mb-0">JSON Request Body (payload)</label>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-primary py-0 px-2 small"
                      onClick={() => setJsonPayload(DEFAULT_SAMPLE_PAYLOAD)}
                    >
                      Reset Sample
                    </button>
                  </div>
                  <textarea
                    className="form-control font-monospace text-dark bg-light"
                    rows={8}
                    value={jsonPayload}
                    onChange={(e) => setJsonPayload(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-success w-100 fw-bold py-2"
                  onClick={handleExecuteApiRequest}
                  disabled={isExecutingApi}
                >
                  {isExecutingApi ? '⏳ Executing API Request...' : '🚀 Send API Request & Add Item'}
                </button>

                {/* API Response Viewer */}
                {apiResponse && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="small">API Response:</strong>
                      <span className={`badge ${apiResponse.status === 201 ? 'bg-success' : 'bg-danger'}`}>
                        HTTP {apiResponse.status} {apiResponse.statusText}
                      </span>
                    </div>
                    <pre
                      className="p-3 rounded-3 bg-dark text-white font-monospace small mb-0"
                      style={{ maxHeight: '200px', overflowY: 'auto' }}
                    >
                      {JSON.stringify(apiResponse.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6 col-12">
            {/* Multi-Language Code Snippets */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h3 className="h6 mb-0 fw-bold">💻 Ready-to-use Code Snippets</h3>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'curl' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('curl')}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'javascript' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('javascript')}
                  >
                    JS (Fetch)
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'python' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('python')}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'nodejs' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('nodejs')}
                  >
                    Node.js
                  </button>
                </div>
              </div>
              <div className="card-body p-0 position-relative">
                <pre
                  className="p-3 bg-dark text-success font-monospace small mb-0 rounded-bottom"
                  style={{ minHeight: '260px', overflowX: 'auto' }}
                >
                  {codeSnippet}
                </pre>
                <button
                  type="button"
                  className="btn btn-sm btn-light position-absolute top-0 end-0 m-3 shadow-sm border"
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                >
                  {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                </button>
              </div>
            </div>

            {/* REST API Schema Reference Card */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h3 className="h6 mb-0 fw-bold">📖 Item REST API Schema Specification</h3>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-bordered align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Field</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-bold font-monospace">name</td>
                        <td>String</td>
                        <td><span className="badge bg-danger">Yes</span></td>
                        <td>Product title or service description.</td>
                      </tr>
                      <tr>
                        <td className="fw-bold font-monospace">hsn</td>
                        <td>String</td>
                        <td><span className="badge bg-secondary">Optional</span></td>
                        <td>2/4/6/8-digit Indian GST HSN or SAC code.</td>
                      </tr>
                      <tr>
                        <td className="fw-bold font-monospace">rate</td>
                        <td>Number</td>
                        <td><span className="badge bg-danger">Yes</span></td>
                        <td>Standard selling rate in INR.</td>
                      </tr>
                      <tr>
                        <td className="fw-bold font-monospace">gst</td>
                        <td>Number</td>
                        <td><span className="badge bg-secondary">Optional</span></td>
                        <td>GST slab (0, 5, 12, 18, 28). Default: 18.</td>
                      </tr>
                      <tr>
                        <td className="fw-bold font-monospace">unit</td>
                        <td>String</td>
                        <td><span className="badge bg-secondary">Optional</span></td>
                        <td>UQC code (PCS, BOX, KGS, LTR, MTR, etc.).</td>
                      </tr>
                      <tr>
                        <td className="fw-bold font-monospace">stock</td>
                        <td>Number</td>
                        <td><span className="badge bg-secondary">Optional</span></td>
                        <td>Available quantity in inventory.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER ITEMS DIRECTORY */}
      {activeTab === 'catalog-list' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="input-group" style={{ maxWidth: '400px' }}>
              <span className="input-group-text bg-light">🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Search master items by name, HSN, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-3 py-2">
                {filteredCatalog.length} Total Master SKUs
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary fw-bold"
                onClick={() => {
                  setForm(EMPTY_ITEM_FORM);
                  setEditingId(null);
                  setActiveTab('add-item');
                }}
              >
                ＋ Add New Item
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            {filteredCatalog.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div className="fs-1 mb-2">📦</div>
                <h3 className="h5 fw-bold mb-2">No items found in master catalog.</h3>
                <p className="text-muted small mb-3">Add items manually or use the REST API.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setForm(EMPTY_ITEM_FORM);
                    setEditingId(null);
                    setActiveTab('add-item');
                  }}
                >
                  ＋ Add First Product
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>HSN / SAC</th>
                      <th>Unit</th>
                      <th className="text-end">Selling Rate (₹)</th>
                      <th className="text-end">Cost Rate (₹)</th>
                      <th className="text-center">GST</th>
                      <th className="text-end">Stock</th>
                      <th className="text-center" style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalog.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold text-dark">{item.name}</div>
                          {item.notes && <small className="text-muted">{item.notes}</small>}
                        </td>
                        <td>
                          {item.sku ? (
                            <span className="badge bg-light text-dark border font-monospace">
                              {item.sku}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {item.hsn ? (
                            <span className="badge bg-light text-primary border font-monospace">
                              {item.hsn}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary border">
                            {item.unit || DEFAULT_UNIT}
                          </span>
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹{Number(item.rate || 0).toFixed(2)}
                        </td>
                        <td className="text-end text-muted">
                          ₹{Number(item.purchaseRate || 0).toFixed(2)}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary-subtle text-primary border">
                            {item.gst || 18}%
                          </span>
                        </td>
                        <td className="text-end fw-semibold">
                          {item.stock || 0}
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              title="Edit item"
                              onClick={() => handleEditItem(item)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BULK JSON IMPORT API */}
      {activeTab === 'bulk-json' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <h2 className="h5 mb-0 fw-bold">📥 Bulk JSON Import API</h2>
            <small className="text-muted">
              Paste a JSON array of items exported from ERPs, databases, or suppliers to batch-insert into catalog.
            </small>
          </div>
          <div className="card-body p-4">
            {bulkImportStatus && (
              <div
                className={`alert ${
                  bulkImportStatus.success ? 'alert-success' : 'alert-danger'
                } py-2 mb-3 small`}
              >
                {bulkImportStatus.success
                  ? `✓ Successfully imported and created ${bulkImportStatus.count} items into the master catalog!`
                  : `❌ Bulk Import Error: ${bulkImportStatus.error}`}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold">Paste JSON Array Payload:</label>
              <textarea
                className="form-control font-monospace bg-light"
                rows={10}
                placeholder={`[
  {
    "name": "HP LaserJet Pro MFP M126nw Printer",
    "hsn": "8443",
    "unit": "PCS",
    "rate": 18500,
    "purchaseRate": 15200,
    "gst": 18,
    "stock": 8,
    "sku": "HP-M126NW"
  },
  {
    "name": "Cat6 High Speed Ethernet Cable 20M",
    "hsn": "8544",
    "unit": "MTR",
    "rate": 450,
    "purchaseRate": 280,
    "gst": 18,
    "stock": 50,
    "sku": "CAB-CAT6-20M"
  }
]`}
                value={bulkJsonInput}
                onChange={(e) => setBulkJsonInput(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary px-4 fw-bold"
              onClick={handleProcessBulkJson}
            >
              📥 Parse &amp; Ingest Bulk JSON Items
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemCatalogApi;
