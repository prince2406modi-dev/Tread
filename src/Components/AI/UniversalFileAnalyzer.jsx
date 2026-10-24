import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  analyzeAnyFile,
  analysisToInvoice,
  analysisToPurchaseBill,
  analysisToStockItems,
} from '../../services/fileAnalyzerService.js';
import { validateGSTIN } from '../../services/gstinValidator.js';

/**
 * ============================================================================
 * UNIVERSAL AI FILE & DOCUMENT INTELLIGENCE COMPONENT
 * ============================================================================
 * 
 * Deep, automated file parser for:
 * - Excel spreadsheets (.xlsx, .xls)
 * - PDF Invoices and Statements (.pdf)
 * - CSV, TSV, TXT files (.csv, .tsv, .txt)
 * - JSON GSTR / e-Invoice schemas (.json)
 * - Receipt and Bill Images (.png, .jpg, .jpeg, .webp)
 * 
 * Provides:
 * 1. Instant Document Classification & Anomaly Detection
 * 2. Visual Entity Extraction (Party, GSTIN, Dates, Financials)
 * 3. Editable Line Items Grid
 * 4. 1-Click Converters to:
 *    - Active Sales Tax Invoice
 *    - Inward Purchase Bill
 *    - Master Stock Catalog
 *    - Parties / Accounts Directory
 * 5. Interactive Document Q&A Chat
 * 
 * Designed cleanly so coders can edit heuristics and extend functionality.
 */
export default function UniversalFileAnalyzer({
  onLoadInvoiceToEditor,
  onSavePurchaseBills,
  onSaveStock,
  onSaveCustomers,
  onNavigate,
  onBack,
  customers = [],
  stockItems = [],
  purchaseBills = [],
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'items' | 'qa' | 'raw'
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);

  // Document Q&A chat state
  const [qaMessages, setQaMessages] = useState([]);
  const [qaInput, setQaInput] = useState('');
  const qaEndRef = useRef(null);

  // File drag & drop handlers
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
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  // Main file processing execution
  const processUploadedFile = async (file) => {
    if (!file) return;
    setIsAnalyzing(true);
    setNotification(null);

    try {
      const parsed = await analyzeAnyFile(file);
      setAnalysisResult(parsed);
      setEditableItems(parsed.items || []);

      // Seed initial QA welcome message for this specific document
      setQaMessages([
        {
          id: 'doc-init',
          role: 'system',
          text: `📄 **${parsed.fileName}** successfully analyzed!\n` +
            `• Document Class: **${parsed.documentLabel}**\n` +
            `• Extracted Party: **${parsed.party.name || 'Unspecified'}**\n` +
            `• Total Amount: **₹${parsed.meta.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**\n` +
            `• Items Found: **${parsed.items.length}** items\n\n` +
            `You can ask me any question about this document below (e.g. *"Show highest rate item"*, *"What is the GST rate?"*, *"Check invoice balance"*).`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setNotification({
        type: 'success',
        message: `✓ Analyzed "${parsed.fileName}" (${(parsed.fileSize / 1024).toFixed(1)} KB) — Identified as ${parsed.documentLabel}`,
      });
    } catch (err) {
      console.error('File Analysis Error:', err);
      setNotification({
        type: 'danger',
        message: `Failed to analyze file: ${err.message || 'Unknown parsing error.'}`,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Inline table editing for extracted items
  const handleItemFieldChange = (index, field, value) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'quantity' || field === 'rate' || field === 'gstPercent') {
        target[field] = parseFloat(value) || 0;
        const q = target.quantity || 1;
        const r = target.rate || 0;
        const gst = target.gstPercent || 18;
        const taxable = q * r;
        target.taxAmount = (taxable * gst) / 100;
        target.total = taxable + target.taxAmount;
      } else {
        target[field] = value;
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Recomputed totals from editable items
  const computedTotals = useMemo(() => {
    if (!editableItems || editableItems.length === 0) {
      return {
        subtotal: analysisResult?.meta?.subtotal || 0,
        totalTax: analysisResult?.meta?.totalTax || 0,
        totalAmount: analysisResult?.meta?.totalAmount || 0,
      };
    }
    const sub = editableItems.reduce((acc, it) => acc + (Number(it.quantity || 1) * Number(it.rate || 0)), 0);
    const tax = editableItems.reduce((acc, it) => acc + (Number(it.taxAmount) || ((Number(it.quantity || 1) * Number(it.rate || 0) * (Number(it.gstPercent) || 18)) / 100)), 0);
    return {
      subtotal: sub,
      totalTax: tax,
      totalAmount: sub + tax,
    };
  }, [editableItems, analysisResult]);

  // =========================================================
  // 1-CLICK CONVERSION WORKFLOWS
  // =========================================================

  // 1. Convert to Active Sales Invoice
  const handleConvertToInvoice = () => {
    if (!analysisResult) return;
    const invoicePayload = analysisToInvoice({
      ...analysisResult,
      items: editableItems,
      meta: {
        ...analysisResult.meta,
        ...computedTotals,
      },
    });

    if (onLoadInvoiceToEditor) {
      onLoadInvoiceToEditor(invoicePayload);
      if (onNavigate) onNavigate('Add Sales');
    }
  };

  // 2. Convert to Inward Purchase Bill
  const handleConvertToPurchaseBill = () => {
    if (!analysisResult) return;
    const bill = analysisToPurchaseBill({
      ...analysisResult,
      items: editableItems,
      meta: {
        ...analysisResult.meta,
        ...computedTotals,
      },
    });

    if (onSavePurchaseBills) {
      onSavePurchaseBills([bill, ...(purchaseBills || [])]);
      setNotification({
        type: 'success',
        message: `✓ Recorded Purchase Bill #${bill.billNumber} for ${bill.partyName} (₹${bill.totalAmount.toFixed(2)})`,
      });
      if (onNavigate) {
        setTimeout(() => onNavigate('List Purchase'), 1200);
      }
    }
  };

  // 3. Bulk Import to Master Stock Catalog
  const handleImportToStock = () => {
    if (!editableItems || editableItems.length === 0) {
      alert('No line items available to import into stock.');
      return;
    }
    const newStock = analysisToStockItems({ items: editableItems });
    if (onSaveStock) {
      onSaveStock([...newStock, ...(stockItems || [])]);
      setNotification({
        type: 'success',
        message: `✓ Successfully added ${newStock.length} items to Master Stock Catalog!`,
      });
    }
  };

  // 4. Save Extracted Party to Customers/Vendors Master
  const handleSaveParty = () => {
    if (!analysisResult || !analysisResult.party.name) {
      alert('No party name was detected in this document.');
      return;
    }
    const party = analysisResult.party;
    const newCustomer = {
      id: `party-${Date.now()}`,
      name: party.name,
      gstin: party.gstin || '',
      phone: party.phone || '',
      address: party.address || '',
      state: party.state || '',
      type: analysisResult.category === 'purchase' ? 'Vendor' : 'Customer',
      createdAt: new Date().toISOString(),
    };

    if (onSaveCustomers) {
      onSaveCustomers([newCustomer, ...(customers || [])]);
      setNotification({
        type: 'success',
        message: `✓ Saved party "${party.name}" ${party.gstin ? `(${party.gstin})` : ''} to Accounts Directory!`,
      });
    }
  };

  // 5. Instant Clean Excel Export
  const handleExportCleanExcel = () => {
    if (!analysisResult) return;
    const exportData = editableItems.map((it, idx) => ({
      'S.No': idx + 1,
      'Item Description': it.name,
      'HSN/SAC': it.hsn || '',
      'Quantity': it.quantity,
      'Unit': it.unit,
      'Rate (INR)': it.rate,
      'GST Slab (%)': it.gstPercent,
      'Tax Amount (INR)': it.taxAmount || ((it.quantity * it.rate * it.gstPercent) / 100),
      'Total (INR)': it.total || (it.quantity * it.rate * (1 + it.gstPercent / 100)),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
    const outName = `${analysisResult.fileName.replace(/\.[^/.]+$/, '')}_analyzed.xlsx`;
    XLSX.writeFile(wb, outName);
  };

  // =========================================================
  // INTERACTIVE DOCUMENT Q&A CHAT
  // =========================================================
  const handleSendQa = () => {
    const q = qaInput.trim();
    if (!q || !analysisResult) return;

    const userEntry = {
      id: `qa-${Date.now()}`,
      role: 'user',
      text: q,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setQaMessages((prev) => [...prev, userEntry]);
    setQaInput('');

    // Answer generator using analyzed facts
    setTimeout(() => {
      const lower = q.toLowerCase();
      let reply = '';

      if (lower.includes('highest') || lower.includes('costliest') || lower.includes('max')) {
        const sorted = [...editableItems].sort((a, b) => (b.rate || 0) - (a.rate || 0));
        if (sorted.length > 0) {
          reply = `The highest rate item is **${sorted[0].name}** priced at **₹${sorted[0].rate}** per ${sorted[0].unit || 'PCS'} (Total: ₹${sorted[0].total || (sorted[0].quantity * sorted[0].rate)}).`;
        } else {
          reply = 'No line items are currently loaded.';
        }
      } else if (lower.includes('tax') || lower.includes('gst')) {
        reply = `**Tax Breakdown**:\n` +
          `• Taxable Subtotal: ₹${computedTotals.subtotal.toFixed(2)}\n` +
          `• CGST: ₹${(analysisResult.meta.cgst || computedTotals.totalTax / 2).toFixed(2)}\n` +
          `• SGST: ₹${(analysisResult.meta.sgst || computedTotals.totalTax / 2).toFixed(2)}\n` +
          `• Total Tax: ₹${computedTotals.totalTax.toFixed(2)}\n` +
          `• Grand Total: ₹${computedTotals.totalAmount.toFixed(2)}`;
      } else if (lower.includes('gstin') || lower.includes('party')) {
        const gstin = analysisResult.party.gstin;
        if (gstin) {
          const check = validateGSTIN(gstin);
          reply = `**Party Details**:\n` +
            `• Name: **${analysisResult.party.name || 'N/A'}**\n` +
            `• GSTIN: \`${gstin}\` (${check.isValid ? '✓ Valid Checksum' : '⚠️ Invalid Checksum'})\n` +
            `• State: ${check.stateName || 'India'}\n` +
            `• Address: ${analysisResult.party.address || 'Not specified'}`;
        } else {
          reply = `Party Name: **${analysisResult.party.name || 'Not detected'}**. No GSTIN was found in this file.`;
        }
      } else if (lower.includes('hsn')) {
        const hsns = editableItems.map((it) => it.hsn).filter(Boolean);
        const uniqueHsn = [...new Set(hsns)];
        reply = `Found **${uniqueHsn.length}** distinct HSN/SAC codes: ${uniqueHsn.map((h) => `\`${h}\``).join(', ') || 'None'}.`;
      } else {
        reply = `Based on **${analysisResult.fileName}**:\n` +
          `• Document Class: ${analysisResult.documentLabel}\n` +
          `• Party: ${analysisResult.party.name || 'N/A'}\n` +
          `• Invoice / Ref: ${analysisResult.meta.invoiceNumber || 'N/A'}\n` +
          `• Items: ${editableItems.length} lines parsed.\n` +
          `• Total Amount: ₹${computedTotals.totalAmount.toFixed(2)}`;
      }

      setQaMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      qaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  return (
    <div className="container-fluid py-3 px-md-4" style={{ minHeight: '85vh', background: '#f8fafc' }}>
      {/* Header Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '24px' }}>⚡</span>
            <h1 className="h4 fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.02em' }}>
              Universal AI File &amp; Document Intelligence
            </h1>
            <span
              className="badge"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              Multi-Format Engine
            </span>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Drag &amp; drop <strong>ANY</strong> file (Excel, PDF, CSV, TXT, JSON, Scanned Receipts) to analyze, extract line items, detect anomalies, and convert into live GST invoices or stock items.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {onBack && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3 fw-semibold"
              onClick={onBack}
            >
              ← Back to Workspace
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`alert alert-${notification.type} alert-dismissible fade show py-2 px-3 mb-3 shadow-xs small d-flex align-items-center justify-content-between`}
          role="alert"
        >
          <span>{notification.message}</span>
          <button
            type="button"
            className="btn-close py-2"
            onClick={() => setNotification(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        className={`p-4 text-center rounded-4 mb-4 transition-all position-relative overflow-hidden ${
          dragActive ? 'border-primary bg-primary-subtle' : 'border-secondary-subtle bg-white'
        }`}
        style={{
          border: '2px dashed #cbd5e1',
          cursor: 'pointer',
          boxShadow: '0 4px 16px -4px rgba(15,23,42,0.06)',
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.pdf,.csv,.tsv,.txt,.json,image/*"
          className="d-none"
          onChange={handleFileInputChange}
        />

        <div className="py-3">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              fontSize: '28px',
            }}
          >
            {isAnalyzing ? '⏳' : '📁'}
          </div>

          <h2 className="h6 fw-bold mb-1 text-dark">
            {isAnalyzing
              ? 'AI Document Engine Analyzing File...'
              : 'Drop any Excel, PDF, CSV, TXT, JSON, or Bill Image here'}
          </h2>
          <p className="small text-muted mb-2">
            Supports Tally &amp; Busy spreadsheets, Tax Invoices (PDF/Image), GSTR-1/2B JSON, e-Invoices, and custom vendor lists.
          </p>

          <button
            type="button"
            className="btn btn-sm btn-primary px-3 fw-semibold shadow-xs"
            disabled={isAnalyzing}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isAnalyzing ? 'Processing...' : 'Browse Local Files'}
          </button>
        </div>
      </div>

      {/* Analysis Results Dashboard */}
      {analysisResult && (
        <div className="row g-3">
          {/* Top Quick Actions Bar */}
          <div className="col-12">
            <div
              className="card border-0 rounded-4 shadow-sm p-3 bg-white d-flex flex-wrap flex-md-row align-items-center justify-content-between gap-3"
              style={{ borderLeft: '4px solid #6366f1' }}
            >
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-dark" style={{ fontSize: '15px' }}>
                    {analysisResult.fileName}
                  </span>
                  <span className="badge bg-light text-dark border">
                    {analysisResult.documentLabel}
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    {analysisResult.items.length} items parsed
                  </span>
                </div>
                <div className="small text-muted mt-1">
                  Party: <strong>{analysisResult.party.name || 'Unspecified'}</strong> | Total: <strong>₹{computedTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* 1-Click Conversions */}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-semibold px-3 shadow-xs d-flex align-items-center gap-1.5"
                  onClick={handleConvertToInvoice}
                  title="Open this document as an active Tax Invoice in the Editor"
                >
                  <span>📝</span>
                  <span>Open in Invoice Editor</span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-success fw-semibold px-3 shadow-xs d-flex align-items-center gap-1.5"
                  onClick={handleConvertToPurchaseBill}
                  title="Record as inward purchase bill in accounts"
                >
                  <span>🛒</span>
                  <span>Record Purchase Bill</span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-warning text-dark fw-semibold px-3 shadow-xs d-flex align-items-center gap-1.5"
                  onClick={handleImportToStock}
                  title="Bulk import extracted items into Master Stock Catalog"
                >
                  <span>📦</span>
                  <span>Import to Stock</span>
                </button>

                {analysisResult.party.name && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark fw-semibold px-3 d-flex align-items-center gap-1.5"
                    onClick={handleSaveParty}
                    title="Save party details to Accounts / Customers Directory"
                  >
                    <span>👥</span>
                    <span>Save Party</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary fw-semibold px-2.5"
                  onClick={handleExportCleanExcel}
                  title="Export extracted data to clean Excel sheet"
                >
                  <span>📥 Clean XLSX</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="col-12">
            <ul className="nav nav-pills gap-2 border-bottom pb-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-1.5 px-3 fw-semibold small ${activeTab === 'overview' ? 'active' : 'text-dark bg-white border'}`}
                  onClick={() => setActiveTab('overview')}
                >
                  📋 AI Executive Overview &amp; Compliance
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-1.5 px-3 fw-semibold small ${activeTab === 'items' ? 'active' : 'text-dark bg-white border'}`}
                  onClick={() => setActiveTab('items')}
                >
                  📑 Line Items ({editableItems.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-1.5 px-3 fw-semibold small ${activeTab === 'qa' ? 'active' : 'text-dark bg-white border'}`}
                  onClick={() => setActiveTab('qa')}
                >
                  💬 Document Q&amp;A Chat
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-1.5 px-3 fw-semibold small ${activeTab === 'raw' ? 'active' : 'text-dark bg-white border'}`}
                  onClick={() => setActiveTab('raw')}
                >
                  🔍 Extracted Text &amp; Rows
                </button>
              </li>
            </ul>
          </div>

          {/* TAB 1: OVERVIEW & COMPLIANCE */}
          {activeTab === 'overview' && (
            <>
              {/* Financial KPI Cards */}
              <div className="col-md-3">
                <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
                  <div className="text-muted small fw-semibold">Taxable Subtotal</div>
                  <div className="h4 fw-bold text-dark mt-1 mb-0">
                    ₹{computedTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
                  <div className="text-muted small fw-semibold">Total GST (Tax)</div>
                  <div className="h4 fw-bold text-primary mt-1 mb-0">
                    ₹{computedTotals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
                  <div className="text-muted small fw-semibold">Grand Total Amount</div>
                  <div className="h4 fw-bold text-success mt-1 mb-0">
                    ₹{computedTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
                  <div className="text-muted small fw-semibold">Extracted Line Items</div>
                  <div className="h4 fw-bold text-dark mt-1 mb-0">
                    {editableItems.length} Products
                  </div>
                </div>
              </div>

              {/* Party & Metadata Summary */}
              <div className="col-md-6">
                <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
                  <h3 className="h6 fw-bold text-dark mb-3">🏢 Extracted Party &amp; Billing Details</h3>
                  <table className="table table-sm table-borderless small mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted fw-semibold" style={{ width: '130px' }}>Party Name:</td>
                        <td className="fw-bold text-dark">{analysisResult.party.name || 'Not detected in file'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">GSTIN:</td>
                        <td>
                          {analysisResult.party.gstin ? (
                            <span className="font-monospace fw-bold text-primary">
                              {analysisResult.party.gstin}
                            </span>
                          ) : (
                            <span className="text-muted">None specified</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Phone:</td>
                        <td>{analysisResult.party.phone || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Address:</td>
                        <td>{analysisResult.party.address || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Invoice / Ref No:</td>
                        <td className="font-monospace fw-bold">{analysisResult.meta.invoiceNumber || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Document Date:</td>
                        <td>{analysisResult.meta.date || 'Today'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Insights & Compliance Anomalies */}
              <div className="col-md-6">
                <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
                  <h3 className="h6 fw-bold text-dark mb-3">🛡️ AI Compliance &amp; Anomaly Scan</h3>

                  {analysisResult.insights.length > 0 && (
                    <div className="mb-3">
                      <div className="small fw-bold text-success mb-1">Key Insights:</div>
                      <ul className="list-unstyled small mb-0">
                        {analysisResult.insights.map((ins, i) => (
                          <li key={i} className="mb-1 text-dark">
                            {ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.anomalies.length > 0 ? (
                    <div>
                      <div className="small fw-bold text-danger mb-1">Attention / Anomalies Detected:</div>
                      <ul className="list-unstyled small mb-0">
                        {analysisResult.anomalies.map((anom, i) => (
                          <li key={i} className="mb-1 text-danger">
                            • {anom}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="alert alert-success py-2 px-3 small mb-0">
                      ✓ No arithmetic mismatches or critical GST anomalies detected.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: INTERACTIVE LINE ITEMS TABLE */}
          {activeTab === 'items' && (
            <div className="col-12">
              <div className="card border-0 rounded-4 shadow-sm overflow-hidden bg-white">
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                  <span className="fw-bold text-dark small">
                    Editable Extracted Items ({editableItems.length})
                  </span>
                  <span className="small text-muted">
                    Values can be edited before converting to Invoice or Purchase Bill.
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light text-muted">
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Item Description</th>
                        <th style={{ width: '110px' }}>HSN/SAC</th>
                        <th style={{ width: '90px' }}>Qty</th>
                        <th style={{ width: '80px' }}>Unit</th>
                        <th style={{ width: '110px' }}>Rate (₹)</th>
                        <th style={{ width: '90px' }}>GST %</th>
                        <th style={{ width: '120px' }}>Total (₹)</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableItems.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4 text-muted">
                            No items found in this document.
                          </td>
                        </tr>
                      ) : (
                        editableItems.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="text-muted">{idx + 1}</td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 bg-light"
                                value={it.name}
                                onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 bg-light font-monospace"
                                value={it.hsn || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'hsn', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm border-0 bg-light text-end"
                                value={it.quantity}
                                onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 bg-light text-uppercase"
                                value={it.unit}
                                onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm border-0 bg-light text-end fw-semibold"
                                value={it.rate}
                                onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                              />
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm border-0 bg-light"
                                value={it.gstPercent || 18}
                                onChange={(e) => handleItemFieldChange(idx, 'gstPercent', e.target.value)}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="text-end fw-bold text-dark">
                              ₹{(Number(it.total) || (Number(it.quantity || 1) * Number(it.rate || 0) * (1 + (Number(it.gstPercent) || 18) / 100))).toFixed(2)}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove item"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan="5" className="text-end">Computed Totals:</td>
                        <td className="text-end">₹{computedTotals.subtotal.toFixed(2)}</td>
                        <td className="text-center">GST ₹{computedTotals.totalTax.toFixed(2)}</td>
                        <td className="text-end text-success">₹{computedTotals.totalAmount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT Q&A CHAT */}
          {activeTab === 'qa' && (
            <div className="col-12">
              <div className="card border-0 rounded-4 shadow-sm overflow-hidden bg-white" style={{ minHeight: '420px' }}>
                <div className="p-3 border-bottom bg-light">
                  <h3 className="h6 fw-bold mb-0 text-dark">💬 Ask Questions About This Document</h3>
                  <div className="small text-muted">
                    Interact directly with extracted invoice data, verify prices, check tax calculations, and get instant answers.
                  </div>
                </div>

                <div className="p-3 overflow-auto" style={{ maxHeight: '340px', minHeight: '260px' }}>
                  {qaMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`d-flex mb-2 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                    >
                      <div
                        className={`p-3 rounded-4 small ${
                          msg.role === 'user'
                            ? 'bg-primary text-white'
                            : msg.role === 'system'
                            ? 'bg-light border text-dark'
                            : 'bg-white border shadow-xs text-dark'
                        }`}
                        style={{ maxWidth: '85%', whiteSpace: 'pre-line' }}
                      >
                        {msg.text}
                        <div
                          className={`mt-1 ${msg.role === 'user' ? 'text-white-50' : 'text-muted'}`}
                          style={{ fontSize: '10px' }}
                        >
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={qaEndRef} />
                </div>

                <div className="p-3 border-top bg-light">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendQa();
                    }}
                    className="d-flex gap-2"
                  >
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-3 shadow-none"
                      placeholder="Ask anything: e.g. What is the total tax? Highest priced item? Check party GSTIN..."
                      value={qaInput}
                      onChange={(e) => setQaInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary px-3 fw-semibold rounded-3 shadow-xs"
                      disabled={!qaInput.trim()}
                    >
                      Ask
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RAW PREVIEW */}
          {activeTab === 'raw' && (
            <div className="col-12">
              <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
                <h3 className="h6 fw-bold mb-2">Raw Text / Stream Extraction</h3>
                <pre
                  className="bg-light p-3 rounded-3 small font-monospace text-muted"
                  style={{ maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
                >
                  {analysisResult.rawTextPreview || 'No raw text extracted.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
