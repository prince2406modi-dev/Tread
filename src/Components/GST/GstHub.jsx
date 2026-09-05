import { useState, useMemo, useDeferredValue } from 'react';
import * as XLSX from 'xlsx';
import {
  parseGstJsonFile,
  parseGstExcelWorkbook,
  reconcile2bWithPurchaseBills,
  generateGstr1UploadJson,
} from '../../services/gstFileParser.js';
import { validateGSTIN } from '../../services/gstinValidator.js';
import { searchHSNCatalog } from '../../services/hsnValidator.js';

export default function GstHub({
  invoices = [],
  purchaseBills = [],
  customers = [],
  company = {},
  onSaveInvoices,
  onSavePurchaseBills,
  onSaveCustomers,
  onBack,
  initialTab = 'importer',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'importer' | 'gstr1' | 'reconciliation' | 'gstr3b' | 'tools'
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const deferredFilter = useDeferredValue(filterQuery);

  // Return Period state for GSTR-1 / 3B
  const [returnPeriod, setReturnPeriod] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${m}${d.getFullYear()}`;
  });

  // Tools Tab State
  const [lookupGstin, setLookupGstin] = useState('');
  const [hsnSearchText, setHsnSearchText] = useState('');
  const [calcGrossAmount, setCalcGrossAmount] = useState('1180');
  const [calcGstRate, setCalcGstRate] = useState(18);

  // Parse uploaded file
  const handleFileProcess = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const fileName = file.name;
      const lower = fileName.toLowerCase();

      if (lower.endsWith('.json')) {
        const text = await file.text();
        const parsed = parseGstJsonFile(text);
        setImportResult(parsed);
        setStatusMessage({
          type: 'success',
          text: `✓ Successfully parsed ${parsed.fileType.label} with ${parsed.invoices.length} transactions.`,
        });
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const parsed = parseGstExcelWorkbook(workbook, fileName);
        setImportResult(parsed);
        setStatusMessage({
          type: 'success',
          text: `✓ Successfully parsed ${parsed.fileType.label} with ${parsed.invoices.length} records.`,
        });
      } else {
        throw new Error('Unsupported file extension. Please upload a .json, .xlsx, .xls, or .csv GST file.');
      }
    } catch (err) {
      console.error('GST Import Error:', err);
      setStatusMessage({
        type: 'danger',
        text: `Error processing file: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag & drop handlers
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
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // 1-Click Import into Sales Invoices
  const handleImportToSales = () => {
    if (!importResult || importResult.invoices.length === 0) return;
    const existingNums = new Set(invoices.map((i) => String(i.invoiceNumber || '').trim().toLowerCase()));
    const newInvoices = [];
    let duplicateCount = 0;

    importResult.invoices.forEach((inv) => {
      const num = String(inv.invoiceNumber || '').trim().toLowerCase();
      if (num && !existingNums.has(num)) {
        newInvoices.push(inv);
        existingNums.add(num);
      } else {
        duplicateCount++;
      }
    });

    if (newInvoices.length > 0 && onSaveInvoices) {
      onSaveInvoices([...newInvoices, ...invoices]);
      setStatusMessage({
        type: 'success',
        text: `✓ Imported ${newInvoices.length} invoices into Sales Register! ${duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : ''}`,
      });
    } else {
      setStatusMessage({
        type: 'warning',
        text: `All ${duplicateCount} invoices already exist in your Sales Register.`,
      });
    }
  };

  // 1-Click Import into Purchase Bills
  const handleImportToPurchase = () => {
    if (!importResult || importResult.invoices.length === 0) return;
    const existingNums = new Set(purchaseBills.map((b) => String(b.billNumber || '').trim().toLowerCase()));
    const newBills = [];
    let duplicateCount = 0;

    importResult.invoices.forEach((inv) => {
      const num = String(inv.billNumber || inv.invoiceNumber || '').trim().toLowerCase();
      if (num && !existingNums.has(num)) {
        newBills.push({
          id: inv.id || `pb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          billNumber: inv.billNumber || inv.invoiceNumber,
          billDate: inv.billDate || inv.invoiceDate,
          vendorName: inv.vendorName || inv.customerName || 'Registered Supplier',
          vendorGstin: inv.vendorGstin || inv.customerGstin || '',
          itcEligible: inv.itcAvailable !== false,
          items: inv.items || [],
          totals: inv.totals || { taxableAmount: 0, totalGst: 0, total: 0 },
        });
        existingNums.add(num);
      } else {
        duplicateCount++;
      }
    });

    if (newBills.length > 0 && onSavePurchaseBills) {
      onSavePurchaseBills([...newBills, ...purchaseBills]);
      setStatusMessage({
        type: 'success',
        text: `✓ Imported ${newBills.length} purchase bills into Purchase Register! ${duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : ''}`,
      });
    } else {
      setStatusMessage({
        type: 'warning',
        text: `All ${duplicateCount} bills already exist in your Purchase Register.`,
      });
    }
  };

  // 1-Click Import Parties (Customers / Vendors)
  const handleImportParties = () => {
    if (!importResult) return;
    const partiesToImport = importResult.parties && importResult.parties.length > 0
      ? importResult.parties
      : importResult.invoices.map((inv) => ({
          name: inv.customerName || inv.vendorName,
          gstin: inv.customerGstin || inv.vendorGstin,
          type: importResult.fileType.category === 'purchase' ? 'Vendor' : 'Customer',
        }));

    const existingGstins = new Set(customers.map((c) => (c.gstin || '').trim().toUpperCase()).filter(Boolean));
    const newParties = [];

    partiesToImport.forEach((p) => {
      const g = (p.gstin || '').trim().toUpperCase();
      if (g && !existingGstins.has(g)) {
        newParties.push({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: p.name,
          gstin: g,
          type: p.type || 'Customer',
          phone: '',
          email: '',
          address: '',
        });
        existingGstins.add(g);
      }
    });

    if (newParties.length > 0 && onSaveCustomers) {
      onSaveCustomers([...customers, ...newParties]);
      setStatusMessage({
        type: 'success',
        text: `✓ Added ${newParties.length} new parties to your Customer & Vendor Master!`,
      });
    } else {
      setStatusMessage({
        type: 'info',
        text: 'All party GST numbers already exist in your directory.',
      });
    }
  };

  // Reconciliation computation
  const reconciliationData = useMemo(() => {
    const gstr2bInvoices = (importResult && importResult.fileType.category === 'purchase')
      ? importResult.invoices
      : [];
    return reconcile2bWithPurchaseBills(gstr2bInvoices, purchaseBills);
  }, [importResult, purchaseBills]);

  // GSTR-1 live metrics from current system invoices
  const gstr1Summary = useMemo(() => {
    let b2bTotal = 0;
    let b2bTax = 0;
    let b2cTotal = 0;
    let b2cTax = 0;
    let b2bCount = 0;
    let b2cCount = 0;

    invoices.forEach((inv) => {
      const isB2B = Boolean(inv.customerGstin && inv.customerGstin !== 'URP' && validateGSTIN(inv.customerGstin).isValid);
      const sub = Number(inv.totals?.subtotal || 0);
      const gst = Number(inv.totals?.totalGst || 0);

      if (isB2B) {
        b2bTotal += sub;
        b2bTax += gst;
        b2bCount++;
      } else {
        b2cTotal += sub;
        b2cTax += gst;
        b2cCount++;
      }
    });

    return {
      b2bCount,
      b2bTotal,
      b2bTax,
      b2cCount,
      b2cTotal,
      b2cTax,
      totalOutward: b2bTotal + b2cTotal,
      totalTax: b2bTax + b2cTax,
    };
  }, [invoices]);

  // GSTR-3B auto-computation
  const gstr3bSummary = useMemo(() => {
    let outwardTaxable = 0;
    let outwardCgst = 0;
    let outwardSgst = 0;
    let outwardIgst = 0;

    invoices.forEach((inv) => {
      outwardTaxable += Number(inv.totals?.subtotal || 0);
      outwardCgst += Number(inv.totals?.cgst || 0);
      outwardSgst += Number(inv.totals?.sgst || 0);
      outwardIgst += Number(inv.totals?.igst || 0);
    });

    let itcTaxable = 0;
    let itcCgst = 0;
    let itcSgst = 0;
    let itcIgst = 0;

    purchaseBills.forEach((bill) => {
      if (bill.itcEligible !== false) {
        itcTaxable += Number(bill.totals?.taxableAmount || bill.totals?.subtotal || 0);
        itcCgst += Number(bill.totals?.cgst || 0);
        itcSgst += Number(bill.totals?.sgst || 0);
        itcIgst += Number(bill.totals?.igst || 0);
      }
    });

    const netCgst = Math.max(0, outwardCgst - itcCgst);
    const netSgst = Math.max(0, outwardSgst - itcSgst);
    const netIgst = Math.max(0, outwardIgst - itcIgst);

    return {
      outwardTaxable,
      outwardCgst,
      outwardSgst,
      outwardIgst,
      outwardTotalGst: outwardCgst + outwardSgst + outwardIgst,
      itcTaxable,
      itcCgst,
      itcSgst,
      itcIgst,
      itcTotal: itcCgst + itcSgst + itcIgst,
      netCgst,
      netSgst,
      netIgst,
      netPayable: netCgst + netSgst + netIgst,
    };
  }, [invoices, purchaseBills]);

  // Export GSTR-1 JSON for portal upload
  const handleExportGstr1Json = () => {
    const json = generateGstr1UploadJson(invoices, company, returnPeriod);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${company.gstin || 'Return'}_${returnPeriod}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export GSTR-1 Excel Table (Portal Offline Tool format: B2B / B2CS / HSN sheets)
  const handleExportGstr1Excel = () => {
    const sellerStateCode = (company.gstin || '').trim().slice(0, 2) || (company.state || '').trim().slice(0, 2) || '';

    const b2bRows = [];
    const b2csMap = {};
    const hsnMap = {};

    invoices.forEach((inv) => {
      const buyerGstin = (inv.customerGstin || '').trim().toUpperCase();
      const isB2B = buyerGstin && buyerGstin !== 'URP' && validateGSTIN(buyerGstin).isValid;
      const isInterState = Boolean(inv.isInterState);
      const pos = isB2B ? buyerGstin.slice(0, 2) : sellerStateCode;

      // Group this invoice's items by GST rate - the official offline-tool
      // template expects one row per invoice PER RATE, not one row per
      // invoice (an invoice with 5% and 18% items needs two rows).
      const rateGroups = {};
      (inv.items || []).forEach((itm) => {
        const qty = Number(itm.quantity || 1);
        const rate = Number(itm.rate || 0);
        const gstPercent = Number(itm.gstPercent ?? 18);
        const taxable = qty * rate;

        rateGroups[gstPercent] = (rateGroups[gstPercent] || 0) + taxable;

        // HSN-wise summary sheet - covers every sale, B2B and B2C together.
        const hsnCode = itm.hsn || '9983';
        if (!hsnMap[hsnCode]) {
          hsnMap[hsnCode] = {
            'HSN': hsnCode,
            'Description': itm.description || 'Goods/Services',
            'UQC': itm.unit || 'NOS',
            'Total Quantity': 0,
            'Rate': gstPercent,
            'Taxable Value': 0,
            'Integrated Tax Amount': 0,
            'Central Tax Amount': 0,
            'State/UT Tax Amount': 0,
            'Total Value': 0,
          };
        }
        const igstAmt = isInterState ? (taxable * gstPercent) / 100 : 0;
        const cgstAmt = isInterState ? 0 : (taxable * gstPercent) / 200;
        const sgstAmt = isInterState ? 0 : (taxable * gstPercent) / 200;
        hsnMap[hsnCode]['Total Quantity'] += qty;
        hsnMap[hsnCode]['Taxable Value'] += taxable;
        hsnMap[hsnCode]['Integrated Tax Amount'] += igstAmt;
        hsnMap[hsnCode]['Central Tax Amount'] += cgstAmt;
        hsnMap[hsnCode]['State/UT Tax Amount'] += sgstAmt;
        hsnMap[hsnCode]['Total Value'] += taxable + igstAmt + cgstAmt + sgstAmt;
      });

      Object.entries(rateGroups).forEach(([rateKey, taxableValue]) => {
        const gstPercent = Number(rateKey);
        if (isB2B) {
          b2bRows.push({
            'GSTIN/UIN of Recipient': buyerGstin,
            'Receiver Name': inv.customerName || '',
            'Invoice Number': inv.invoiceNumber || '',
            'Invoice date': inv.invoiceDate || '',
            'Invoice Value': Number((inv.totals?.total || 0).toFixed(2)),
            'Place Of Supply': pos,
            'Reverse Charge': 'N',
            'Invoice Type': 'Regular',
            'E-Commerce GSTIN': '',
            'Rate': gstPercent,
            'Taxable Value': Number(taxableValue.toFixed(2)),
            'Cess Amount': 0,
          });
        } else {
          // Retail / no-GSTIN sale -> B2CS, grouped by state + rate.
          const key = `${pos}-${gstPercent}`;
          if (!b2csMap[key]) {
            b2csMap[key] = {
              'Type': 'OE',
              'Place Of Supply': pos,
              'Rate': gstPercent,
              'Taxable Value': 0,
              'Cess Amount': 0,
              'E-Commerce GSTIN': '',
            };
          }
          b2csMap[key]['Taxable Value'] += taxableValue;
        }
      });
    });

    const b2csRows = Object.values(b2csMap).map((r) => ({
      ...r,
      'Taxable Value': Number(r['Taxable Value'].toFixed(2)),
    }));

    const hsnRows = Object.values(hsnMap).map((r) => ({
      ...r,
      'Taxable Value': Number(r['Taxable Value'].toFixed(2)),
      'Integrated Tax Amount': Number(r['Integrated Tax Amount'].toFixed(2)),
      'Central Tax Amount': Number(r['Central Tax Amount'].toFixed(2)),
      'State/UT Tax Amount': Number(r['State/UT Tax Amount'].toFixed(2)),
      'Total Value': Number(r['Total Value'].toFixed(2)),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2bRows), 'b2b');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2csRows), 'b2cs');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsnRows), 'hsn');
    // Note: a "b2cl" sheet (large inter-state retail invoices, over Rs 2.5
    // lakh) is intentionally left out for now - see the matching comment in
    // generateGstr1UploadJson() in gstFileParser.js. The app doesn't capture
    // a walk-in customer's state, so we can't classify these accurately
    // without guessing; those sales are safely counted in b2cs instead.

    XLSX.writeFile(wb, `GSTR1_Offline_Export_${returnPeriod}.xlsx`);
  };

  // GSTIN Analyzer Result
  const gstinAnalysis = useMemo(() => {
    if (!lookupGstin || !lookupGstin.trim()) return null;
    return validateGSTIN(lookupGstin);
  }, [lookupGstin]);

  // HSN Search Results
  const hsnResults = useMemo(() => {
    if (!hsnSearchText || hsnSearchText.length < 2) return [];
    return searchHSNCatalog(hsnSearchText).slice(0, 8);
  }, [hsnSearchText]);

  // Reverse GST Calculator values
  const reverseCalc = useMemo(() => {
    const gross = Number(calcGrossAmount || 0);
    const rate = Number(calcGstRate || 18);
    const base = gross / (1 + rate / 100);
    const gst = gross - base;
    return {
      gross,
      base: Number(base.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      cgst: Number((gst / 2).toFixed(2)),
      sgst: Number((gst / 2).toFixed(2)),
    };
  }, [calcGrossAmount, calcGstRate]);

  // Filtered import invoices list
  const filteredImportInvoices = useMemo(() => {
    if (!importResult || !importResult.invoices) return [];
    if (!deferredFilter) return importResult.invoices;
    const q = deferredFilter.toLowerCase();
    return importResult.invoices.filter(
      (inv) =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q))
    );
  }, [importResult, deferredFilter]);

  return (
    <div className="gst-hub-container py-3">
      {/* Header Banner */}
      <div className="card shadow-sm border-0 mb-4 bg-gradient p-4 rounded-3 text-white" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span className="badge bg-primary px-3 py-1 fw-bold fs-7">
                🏛️ GST &amp; Compliance Hub
              </span>
              <span className="badge bg-info text-white px-2 py-1 small">
                Universal GST File Importer &amp; Returns Engine
              </span>
            </div>
            <h1 className="h3 fw-bold mb-1">
              GST File Importer, Returns &amp; ITC Reconciliation
            </h1>
            <p className="mb-0 text-white-50">
              Import all GST file types (GSTR-1, GSTR-2B, GSTR-3B, e-Invoice JSON, Excel Offline Spreadsheets) and auto-reconcile ITC.
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {onBack && (
              <button type="button" className="btn btn-outline-light btn-sm" onClick={onBack}>
                â† Dashboard
              </button>
            )}
            <button
              type="button"
              className="btn btn-success btn-sm fw-bold shadow-sm"
              onClick={handleExportGstr1Json}
            >
              📥 Export GSTR-1 JSON (GSTN)
            </button>
          </div>
        </div>
      </div>

      {/* Status / Alert message */}
      {statusMessage && (
        <div className={`alert alert-${statusMessage.type} border-0 shadow-sm d-flex justify-content-between align-items-center mb-4 rounded-3`}>
          <div>{statusMessage.text}</div>
          <button type="button" className="btn-close btn-sm" onClick={() => setStatusMessage(null)} />
        </div>
      )}

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 gap-2 flex-wrap bg-white p-2 rounded-3 shadow-sm">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'importer' ? 'active' : ''}`}
            onClick={() => setActiveTab('importer')}
          >
            📥 Universal GST Importer (All Files)
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'gstr1' ? 'active' : ''}`}
            onClick={() => setActiveTab('gstr1')}
          >
            📤 GSTR-1 (Sales Outward)
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'reconciliation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reconciliation')}
          >
            âš–ï¸ GSTR-2B vs Books ITC Reconcile
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'gstr3b' ? 'active' : ''}`}
            onClick={() => setActiveTab('gstr3b')}
          >
            📊 GSTR-3B Tax Summary
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            🔍 GSTIN / HSN Directory &amp; Calc
          </button>
        </li>
      </ul>

      {/* ================= TAB 1: UNIVERSAL GST FILE IMPORTER ================= */}
      {activeTab === 'importer' && (
        <div className="row g-4">
          <div className="col-lg-5">
            {/* Upload Box */}
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">📥 Import Any GST File</h2>
                <small className="text-muted">Auto-detects format, extracts invoices &amp; verifies GSTINs</small>
              </div>
              <div className="card-body p-4">
                <div
                  className={`border-2 border-dashed rounded-4 p-4 text-center ${dragActive ? 'bg-primary bg-opacity-10 border-primary' : 'bg-light'}`}
                  style={{ cursor: 'pointer', minHeight: '200px' }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('gst-file-input').click()}
                >
                  <input
                    id="gst-file-input"
                    type="file"
                    className="d-none"
                    accept=".json,.xlsx,.xls,.csv"
                    onChange={(e) => handleFileProcess(e.target.files[0])}
                  />
                  <div className="fs-1 mb-2">📁</div>
                  <div className="fw-bold mb-1">
                    {isProcessing ? 'â³ Parsing GST Document...' : 'Drag & Drop GST File or Click to Browse'}
                  </div>
                  <p className="text-muted small mb-3">
                    Supports <strong>GSTR-1 JSON</strong>, <strong>GSTR-2B JSON</strong>, <strong>e-Invoice IRN</strong>, <strong>e-Way Bill</strong>, and <strong>GST Offline Excel Tool (.XLSX, .CSV)</strong>
                  </p>
                  <button type="button" className="btn btn-sm btn-primary px-3 fw-semibold">
                    Select GST File
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="h6 fw-bold mb-2">Supported Formats:</h3>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge bg-light text-dark border">📤 GSTR-1 JSON</span>
                    <span className="badge bg-light text-dark border">📥 GSTR-2A / 2B JSON</span>
                    <span className="badge bg-light text-dark border">📊 GSTR-3B JSON</span>
                    <span className="badge bg-light text-dark border">⚡ e-Invoice Schema</span>
                    <span className="badge bg-light text-dark border">🚚 e-Way Bill JSON</span>
                    <span className="badge bg-light text-dark border">📑 GST Portal Excel Tool</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            {/* Parsed Output / Actions */}
            {importResult ? (
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <span className="badge bg-success me-2">{importResult.fileType.icon} {importResult.fileType.label}</span>
                    <span className="text-muted small">GSTIN: {importResult.gstin || 'N/A'}</span>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm fw-semibold"
                      onClick={handleImportToSales}
                    >
                      ＋ Import to Sales ({importResult.invoices.length})
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm fw-semibold"
                      onClick={handleImportToPurchase}
                    >
                      ＋ Import to Purchase
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm"
                      onClick={handleImportParties}
                    >
                      👥 Import Parties
                    </button>
                  </div>
                </div>

                <div className="card-body p-3">
                  {/* Summary Metric Cards */}
                  <div className="row g-2 mb-3">
                    <div className="col-sm-3">
                      <div className="p-2 bg-light rounded text-center">
                        <small className="text-muted d-block">Taxable Value</small>
                        <strong className="text-primary">₹{importResult.grossTaxable.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="p-2 bg-light rounded text-center">
                        <small className="text-muted d-block">CGST + SGST</small>
                        <strong>₹{(importResult.totalCgst + importResult.totalSgst).toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="p-2 bg-light rounded text-center">
                        <small className="text-muted d-block">IGST</small>
                        <strong>₹{importResult.totalIgst.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="p-2 bg-success bg-opacity-10 rounded text-center">
                        <small className="text-success fw-bold d-block">Total Invoice Value</small>
                        <strong className="text-success">₹{importResult.totalInvoiceValue.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="input-group input-group-sm mb-3">
                    <span className="input-group-text bg-light">🔍</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search parsed invoices by number, party name, or GSTIN..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                    />
                  </div>

                  {/* Table */}
                  <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table className="table table-hover table-sm align-middle small mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Inv / Bill #</th>
                          <th>Date</th>
                          <th>Party &amp; GSTIN</th>
                          <th className="text-end">Taxable</th>
                          <th className="text-end">Tax</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredImportInvoices.slice(0, 50).map((inv, idx) => (
                          <tr key={inv.id || idx}>
                            <td className="fw-bold text-primary">{inv.invoiceNumber || inv.billNumber || 'N/A'}</td>
                            <td>{inv.invoiceDate || inv.billDate || 'N/A'}</td>
                            <td>
                              <div className="fw-semibold">{inv.customerName || inv.vendorName}</div>
                              <small className="text-muted font-monospace">{inv.customerGstin || inv.vendorGstin || 'URP'}</small>
                            </td>
                            <td className="text-end">₹{(inv.totals?.subtotal || inv.totals?.taxableAmount || 0).toFixed(2)}</td>
                            <td className="text-end">₹{(inv.totals?.totalGst || 0).toFixed(2)}</td>
                            <td className="text-end fw-bold">₹{(inv.totals?.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card shadow-sm border-0 h-100 d-flex align-items-center justify-content-center p-5 text-center text-muted">
                <div>
                  <div className="fs-1 mb-2">📁</div>
                  <div className="fw-bold fs-5">No File Uploaded Yet</div>
                  <p className="small mb-0">Upload a GST JSON or Excel file on the left to preview tables and import records.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: GSTR-1 RETURN & EXPORT HUB ================= */}
      {activeTab === 'gstr1' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h2 className="h5 mb-0 fw-bold">📤 GSTR-1 Sales Outward Returns</h2>
              <small className="text-muted">Generated live from your recorded Sales Invoices in Tread</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: '120px' }}
                value={returnPeriod}
                onChange={(e) => setReturnPeriod(e.target.value)}
                placeholder="MMYYYY"
                title="Return Period (MMYYYY, e.g. 082026)"
              />
              <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={handleExportGstr1Json}>
                📥 Download GSTR-1 JSON
              </button>
              <button type="button" className="btn btn-outline-success btn-sm fw-bold" onClick={handleExportGstr1Excel}>
                📊 Export Excel (B2B)
              </button>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card bg-primary text-white border-0 p-3 rounded-3 shadow-xs">
                  <small className="text-white-50">B2B Invoices (Registered)</small>
                  <div className="fs-4 fw-bold">{gstr1Summary.b2bCount} Invoices</div>
                  <small>Taxable: ₹{gstr1Summary.b2bTotal.toFixed(2)}</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white border-0 p-3 rounded-3 shadow-xs">
                  <small className="text-white-50">B2C Retail (Unregistered)</small>
                  <div className="fs-4 fw-bold">{gstr1Summary.b2cCount} Invoices</div>
                  <small>Taxable: ₹{gstr1Summary.b2cTotal.toFixed(2)}</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white border-0 p-3 rounded-3 shadow-xs">
                  <small className="text-white-50">Total Outward Taxable</small>
                  <div className="fs-4 fw-bold">₹{gstr1Summary.totalOutward.toFixed(2)}</div>
                  <small>Combined Sales</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-dark text-white border-0 p-3 rounded-3 shadow-xs">
                  <small className="text-white-50">Total Output GST</small>
                  <div className="fs-4 fw-bold">₹{gstr1Summary.totalTax.toFixed(2)}</div>
                  <small>CGST + SGST + IGST</small>
                </div>
              </div>
            </div>

            <h3 className="h6 fw-bold mb-3">Live Outward Invoices Ready for Return Filing:</h3>
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>GSTIN</th>
                    <th>Type</th>
                    <th className="text-end">Taxable</th>
                    <th className="text-end">GST</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="fw-bold text-primary">{inv.invoiceNumber}</td>
                      <td>{inv.invoiceDate}</td>
                      <td>{inv.customerName}</td>
                      <td>
                        <span className={`badge ${inv.customerGstin && inv.customerGstin !== 'URP' ? 'bg-success' : 'bg-secondary'}`}>
                          {inv.customerGstin || 'URP'}
                        </span>
                      </td>
                      <td>{inv.invoiceType || 'Tax Invoice'}</td>
                      <td className="text-end">₹{(inv.totals?.subtotal || 0).toFixed(2)}</td>
                      <td className="text-end">₹{(inv.totals?.totalGst || 0).toFixed(2)}</td>
                      <td className="text-end fw-bold">₹{(inv.totals?.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: GSTR-2B RECONCILIATION ================= */}
      {activeTab === 'reconciliation' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <h2 className="h5 mb-0 fw-bold">âš–ï¸ GSTR-2B (Portal) vs Purchase Books (ITC Reconciliation)</h2>
            <small className="text-muted">Compare auto-drafted ITC statements against recorded purchase vouchers</small>
          </div>
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="p-3 bg-success bg-opacity-10 rounded text-center">
                  <span className="fs-3">✅</span>
                  <div className="fw-bold text-success mt-1">{reconciliationData.matched.length} Matched</div>
                  <small className="text-muted">₹{reconciliationData.claimableItcMatched.toFixed(2)} Eligible ITC</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="p-3 bg-warning bg-opacity-10 rounded text-center">
                  <span className="fs-3">⚠️</span>
                  <div className="fw-bold text-warning mt-1">{reconciliationData.portalOnly.length} Missing in Books</div>
                  <small className="text-muted">In 2B but unrecorded</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="p-3 bg-danger bg-opacity-10 rounded text-center">
                  <span className="fs-3">❌</span>
                  <div className="fw-bold text-danger mt-1">{reconciliationData.booksOnly.length} Missing in Portal</div>
                  <small className="text-muted">Supplier not filed GSTR-1</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="p-3 bg-info bg-opacity-10 rounded text-center">
                  <span className="fs-3">⚡</span>
                  <div className="fw-bold text-info mt-1">{reconciliationData.amountMismatch.length} Mismatches</div>
                  <small className="text-muted">Amount discrepancy</small>
                </div>
              </div>
            </div>

            {reconciliationData.matched.length === 0 && reconciliationData.portalOnly.length === 0 ? (
              <div className="alert alert-info">
                â„¹ï¸ To run live ITC Reconciliation, upload a <strong>GSTR-2B JSON or Excel file</strong> in the <strong>&quot;Universal GST Importer&quot;</strong> tab.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= TAB 4: GSTR-3B TAX SUMMARY ================= */}
      {activeTab === 'gstr3b' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <h2 className="h5 mb-0 fw-bold">📊 GSTR-3B Monthly Return Summary</h2>
            <small className="text-muted">Tax liability computation, eligible ITC, and Net Cash Tax Payable</small>
          </div>
          <div className="card-body p-4">
            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Section</th>
                    <th>Details</th>
                    <th className="text-end">Taxable Value</th>
                    <th className="text-end">IGST</th>
                    <th className="text-end">CGST</th>
                    <th className="text-end">SGST</th>
                    <th className="text-end">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fw-bold">3.1 (a)</td>
                    <td>Outward Taxable Supplies (Sales)</td>
                    <td className="text-end fw-bold">₹{gstr3bSummary.outwardTaxable.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.outwardIgst.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.outwardCgst.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.outwardSgst.toFixed(2)}</td>
                    <td className="text-end fw-bold text-primary">₹{gstr3bSummary.outwardTotalGst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">4 (A)</td>
                    <td>Eligible Input Tax Credit (ITC from Purchases)</td>
                    <td className="text-end fw-bold">₹{gstr3bSummary.itcTaxable.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.itcIgst.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.itcCgst.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.itcSgst.toFixed(2)}</td>
                    <td className="text-end fw-bold text-success">₹{gstr3bSummary.itcTotal.toFixed(2)}</td>
                  </tr>
                  <tr className="table-warning fw-bold">
                    <td colSpan="2">Net Tax Payable in Cash / Electronic Ledger</td>
                    <td className="text-end">-</td>
                    <td className="text-end">₹{gstr3bSummary.netIgst.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.netCgst.toFixed(2)}</td>
                    <td className="text-end">₹{gstr3bSummary.netSgst.toFixed(2)}</td>
                    <td className="text-end text-danger fs-6">₹{gstr3bSummary.netPayable.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: GSTIN & HSN DIRECTORY & CALCULATOR ================= */}
      {activeTab === 'tools' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">🔍 GSTIN Live Validator</h2>
                <small className="text-muted">Inspect 15-digit GST Number, state jurisdiction &amp; PAN entity</small>
              </div>
              <div className="card-body p-4">
                <input
                  type="text"
                  className="form-control form-control-lg font-monospace mb-3"
                  placeholder="e.g. 27AABCU9603R1ZM"
                  value={lookupGstin}
                  onChange={(e) => setLookupGstin(e.target.value.toUpperCase())}
                />
                {gstinAnalysis ? (
                  <div className={`p-3 rounded-3 ${gstinAnalysis.isValid ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger'}`}>
                    <div className="fw-bold mb-2">{gstinAnalysis.isValid ? '✅ Valid GSTIN Format' : 'âŒ Invalid GSTIN Format'}</div>
                    <ul className="mb-0 small ps-3">
                      <li><strong>State:</strong> {gstinAnalysis.stateName} (Code: {gstinAnalysis.stateCode})</li>
                      <li><strong>PAN:</strong> {gstinAnalysis.pan}</li>
                      <li><strong>Entity Type:</strong> {gstinAnalysis.entityType}</li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 fw-bold">🧮 Reverse GST Calculator</h2>
                <small className="text-muted">Calculate Base Amount &amp; GST from Gross MRP Price</small>
              </div>
              <div className="card-body p-4">
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Gross Total Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={calcGrossAmount}
                      onChange={(e) => setCalcGrossAmount(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">GST Rate (%)</label>
                    <select
                      className="form-select"
                      value={calcGstRate}
                      onChange={(e) => setCalcGstRate(Number(e.target.value))}
                    >
                      <option value="5">5% (Essentials)</option>
                      <option value="12">12% (Standard I)</option>
                      <option value="18">18% (Standard II)</option>
                      <option value="28">28% (Luxury)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Base Taxable Price:</span>
                    <strong className="text-primary">₹{reverseCalc.base.toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Total GST ({calcGstRate}%):</span>
                    <strong>₹{reverseCalc.gst.toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between small text-muted">
                    <span>CGST ({calcGstRate / 2}%) + SGST ({calcGstRate / 2}%):</span>
                    <span>₹{reverseCalc.cgst.toFixed(2)} + ₹{reverseCalc.sgst.toFixed(2)}</span>
                  </div>
                </div>

                <hr className="my-3" />

                <h3 className="h6 fw-bold mb-2">🔍 Search HSN / SAC Catalog</h3>
                <input
                  type="text"
                  className="form-control form-control-sm mb-2"
                  placeholder="Type product name or HSN (e.g. Cotton, Software, 8471)..."
                  value={hsnSearchText}
                  onChange={(e) => setHsnSearchText(e.target.value)}
                />
                {hsnResults.length > 0 ? (
                  <ul className="list-group list-group-flush small border rounded">
                    {hsnResults.map((r) => (
                      <li key={r.code} className="list-group-item d-flex justify-content-between align-items-center py-2">
                        <div>
                          <strong className="text-primary me-2">[{r.code}]</strong>
                          <span>{r.description}</span>
                        </div>
                        <span className="badge bg-secondary">{r.gstRate}% GST</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
