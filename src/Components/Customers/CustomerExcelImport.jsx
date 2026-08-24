import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { validateGSTIN, GST_STATE_CODES } from '../../services/gstinValidator.js';

// Helper to parse HTML table directly from Busy / Tally "Chart of Accounts" exports
function parseHtmlTableToRows(htmlString) {
  try {
    if (typeof window === 'undefined' || !htmlString || !htmlString.includes('<')) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return null;

    let headers = [];
    let dataRowStartIndex = 0;

    for (let r = 0; r < rows.length; r++) {
      const ths = Array.from(rows[r].querySelectorAll('th, td')).map((c) => c.textContent.trim());
      if (ths.some((t) => /name|group|gst|opening|balance|tel|alias|printname/i.test(t))) {
        headers = ths;
        dataRowStartIndex = r + 1;
        break;
      }
    }

    if (headers.length === 0) {
      headers = Array.from(rows[0].querySelectorAll('td, th')).map((c) => c.textContent.trim());
      dataRowStartIndex = 1;
    }

    const result = [];
    for (let i = dataRowStartIndex; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td, th')).map((c) => c.textContent.trim());
      if (cells.length === 0 || cells.every((c) => !c || c === '&nbsp;')) continue;

      const rowObj = {};
      headers.forEach((h, colIdx) => {
        if (h) {
          rowObj[h] = cells[colIdx] || '';
        }
      });

      const partyName = rowObj['Name'] || rowObj['PrintName'] || cells[0] || '';
      // Filter out invalid/empty rows or repeated header rows
      if (partyName && partyName.trim() && partyName.toLowerCase() !== 'name') {
        result.push(rowObj);
      }
    }

    return result.length > 0 ? result : null;
  } catch (err) {
    console.warn('HTML parser notice:', err);
    return null;
  }
}

function CustomerExcelImport({ existingCustomers = [], onConfirmImport, onCancel }) {
  const [fileData, setFileData] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [defaultPartyType, setDefaultPartyType] = useState('Customer'); // 'Customer' | 'Vendor' | 'Both'
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'update' | 'keep_both'
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef(null);

  // Download Sample Excel Template (.xlsx)
  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Name': 'AAKSH',
        'Alias': '',
        'Group Name': 'Sundry Debtors',
        'Opening Bal.in Base Currency': '15,17,755.00 Dr',
        'Prev. Bal': '15,17,755.00 Dr',
        'GST No.': '07ABCDE1234F1Z5',
        'Tel. No.': '9876512345',
        'PrintName': 'AAKSH',
        'Tax Category': 'Registered Dealer',
      },
      {
        'Name': 'Alok Enterprises',
        'Alias': '',
        'Group Name': 'Sundry Debtors',
        'Opening Bal.in Base Currency': '2,84,365.00 Dr',
        'Prev. Bal': '2,84,365.00 Dr',
        'GST No.': '09FEUPS9620P1Z3',
        'Tel. No.': '9812345678',
        'PrintName': 'Alok Enterprises',
        'Tax Category': 'Regular GST',
      },
      {
        'Name': 'GULATI CATERERS',
        'Alias': '',
        'Group Name': 'Sundry Debtors',
        'Opening Bal.in Base Currency': '2,57,387.00 Dr',
        'Prev. Bal': '2,57,387.00 Dr',
        'GST No.': '09ABVPG5831F1ZD',
        'Tel. No.': '7217706305',
        'PrintName': 'GULATI CATERERS',
        'Tax Category': 'Regular GST',
      },
      {
        'Name': 'Apex Hardware Supplies',
        'Alias': '',
        'Group Name': 'Sundry Creditors',
        'Opening Bal.in Base Currency': '1,50,000.00 Cr',
        'Prev. Bal': '1,50,000.00 Cr',
        'GST No.': '09AABCA9876C1Z2',
        'Tel. No.': '9811122334',
        'PrintName': 'Apex Hardware Supplies',
        'Tax Category': 'Supplier Vendor',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 32 }, // Name
      { wch: 10 }, // Alias
      { wch: 18 }, // Group Name
      { wch: 22 }, // Opening Bal
      { wch: 18 }, // Prev Bal
      { wch: 18 }, // GST No.
      { wch: 16 }, // Tel No.
      { wch: 32 }, // PrintName
      { wch: 18 }, // Tax Category
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart_of_Accounts');
    XLSX.writeFile(workbook, 'Chart_of_Accounts_Import_Template.xlsx');
  };

  // Download Sample CSV Template (.csv)
  const downloadSampleCsv = () => {
    const sample = `Name,Alias,Group Name,Opening Bal.in Base Currency,Prev. Bal,GST No.,Tel. No.,PrintName,Tax Category
"AAKSH",,"Sundry Debtors","15,17,755.00 Dr","15,17,755.00 Dr",,,"AAKSH",
"Alok Enterprises",,"Sundry Debtors",,,"09FEUPS9620P1Z3",,"Alok Enterprises",
"AMIT DESIGN",,"Sundry Debtors","6,05,444.98 Dr","6,05,444.98 Dr","09AAVFA4747K1ZQ",,"AMIT DESIGN",
"GULATI CATERERS",,"Sundry Debtors","2,57,387.00 Dr","2,57,387.00 Dr","09ABVPG5831F1ZD","7217706305","GULATI CATERERS",`;

    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Chart_of_Accounts_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Smart fuzzy header extractor
  const normalizeRowData = (row, index) => {
    const keys = Object.keys(row);

    const findVal = (matchers) => {
      for (const m of matchers) {
        const key = keys.find((k) =>
          k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(m.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
        if (key && row[key] !== undefined && row[key] !== null) {
          const val = String(row[key]).trim();
          if (val) return val;
        }
      }
      return '';
    };

    // Extract Name
    const name = findVal([
      'name',
      'printname',
      'customername',
      'partyname',
      'companyname',
      'clientname',
      'tradename',
      'firmname',
      'billedto',
      'customer',
    ]);

    // Extract Group Name / Party Type (handles Busy/Tally 'Sundry Debtors' -> Customer, 'Sundry Creditors' -> Vendor)
    const rawType = findVal([
      'groupname',
      'group',
      'partytype',
      'type',
      'category',
      'role',
      'accounttype',
    ]);

    // Extract GSTIN / GST No.
    const gstin = findVal([
      'gstno',
      'gstin',
      'gstnumber',
      'gst',
      'taxid',
      'uin',
    ]).toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Extract Tel / Phone
    const phone = findVal([
      'telno',
      'tel',
      'mobile',
      'phone',
      'contact',
      'cell',
      'mobileno',
      'phoneno',
      'contactno',
      'telephoneno',
    ]);

    // Extract Email
    const email = findVal([
      'email',
      'emailaddress',
      'mail',
      'emailid',
      'partyemail',
    ]);

    // Extract Address & State
    const address = findVal([
      'billingaddress',
      'address',
      'fulladdress',
      'location',
      'street',
      'city',
      'addressline',
    ]);
    const state = findVal(['state', 'statecode', 'province']);

    // Extract Opening Balance & Notes
    const openingBal = findVal([
      'openingbalinbasecurrency',
      'openingbalance',
      'openingbal',
      'prevbal',
      'balance',
    ]);
    const taxCategory = findVal(['taxcategory', 'taxcat']);
    const rawNotes = findVal(['notes', 'remarks', 'description', 'comment', 'alias']);

    // Compile notes
    const notesParts = [];
    if (openingBal) notesParts.push(`Opening Bal: ${openingBal}`);
    if (taxCategory) notesParts.push(`Tax Cat: ${taxCategory}`);
    if (rawNotes) notesParts.push(rawNotes);
    const notes = notesParts.join(' | ');

    // Determine party type
    let resolvedType = defaultPartyType;
    if (rawType) {
      const lower = rawType.toLowerCase();
      if (lower.includes('debtor') || lower.includes('customer') || lower.includes('client') || lower.includes('sale')) {
        resolvedType = 'Customer';
      } else if (lower.includes('creditor') || lower.includes('vendor') || lower.includes('supplier') || lower.includes('purchase')) {
        resolvedType = 'Vendor';
      } else if (lower.includes('both')) {
        resolvedType = 'Both';
      }
    }

    // Auto deduce State from GSTIN if address is empty
    let resolvedAddress = address;
    if (!resolvedAddress && gstin && gstin.length >= 2) {
      const stateCode = gstin.slice(0, 2);
      const stateName = GST_STATE_CODES[stateCode];
      if (stateName) {
        resolvedAddress = `${stateName} (${stateCode}), India`;
      }
    }

    // GSTIN Analysis
    let gstinValid = null;
    if (gstin) {
      const v = validateGSTIN(gstin);
      gstinValid = v.isValid;
    }

    // Check duplicate against existing customers
    const existsByName = existingCustomers.some(
      (c) => c.name && name && c.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    const existsByGstin = Boolean(
      gstin && existingCustomers.some((c) => c.gstin && c.gstin.toUpperCase().trim() === gstin.toUpperCase().trim())
    );

    return {
      index,
      id: uuidv4(),
      name: name || `Imported Party #${index + 1}`,
      type: resolvedType,
      phone: phone || '',
      email: email || '',
      gstin: gstin || '',
      address: resolvedAddress || (state ? `${state}, India` : ''),
      notes: notes || '',
      openingBalance: openingBal || '',
      gstinValid,
      isDuplicate: existsByName || existsByGstin,
      duplicateReason: existsByGstin ? 'Duplicate GSTIN' : existsByName ? 'Duplicate Name' : null,
      selected: Boolean(name && name.trim() && name.toLowerCase() !== 'name'),
    };
  };

  // Process uploaded Excel / CSV / HTML binary or text buffer
  const processExcelBuffer = (bufferOrText, fileName) => {
    try {
      let json = [];

      // Check if input is HTML table string
      if (typeof bufferOrText === 'string' && bufferOrText.includes('<')) {
        const htmlRows = parseHtmlTableToRows(bufferOrText);
        if (htmlRows && htmlRows.length > 0) {
          json = htmlRows;
        }
      }

      if (json.length === 0) {
        const workbook = typeof bufferOrText === 'string'
          ? XLSX.read(bufferOrText, { type: 'string' })
          : XLSX.read(bufferOrText, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      if (!Array.isArray(json) || json.length === 0) {
        alert('No data rows found in this file. Please check the spreadsheet.');
        return;
      }

      const rows = json
        .map((r, i) => normalizeRowData(r, i))
        .filter((r) => r.name && r.name.toLowerCase() !== 'name' && r.name !== 'Chart of Accounts');

      setFileData({ fileName, totalRows: rows.length });
      setParsedRows(rows);

      // Select all non-empty rows by default
      const newSelected = new Set();
      rows.forEach((r, i) => {
        if (r.selected) newSelected.add(i);
      });
      setSelectedIndices(newSelected);
    } catch (err) {
      console.error(err);
      alert('Error reading spreadsheet: ' + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
    const reader = new FileReader();

    if (isHtml) {
      reader.onload = (evt) => {
        processExcelBuffer(evt.target.result, file.name);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        const buffer = new Uint8Array(evt.target.result);
        processExcelBuffer(buffer, file.name);
      };
      reader.readAsArrayBuffer(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
      const reader = new FileReader();
      if (isHtml) {
        reader.onload = (evt) => {
          processExcelBuffer(evt.target.result, file.name);
        };
        reader.readAsText(file);
      } else {
        reader.onload = (evt) => {
          const buffer = new Uint8Array(evt.target.result);
          processExcelBuffer(buffer, file.name);
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };

  // Process text pasted from Excel (HTML / TSV / CSV)
  const handleParsePastedData = () => {
    if (!pastedText.trim()) {
      alert('Please paste some tabular data or HTML table from Excel first.');
      return;
    }

    processExcelBuffer(pastedText, 'Pasted Chart of Accounts Data');
    setPasteMode(false);
  };

  // Selection handlers
  const toggleSelectRow = (idx) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedRows.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedRows.map((_, i) => i)));
    }
  };

  // Update specific row property in preview
  const updateRowField = (idx, field, value) => {
    setParsedRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'gstin') {
          const v = validateGSTIN(value);
          updated.gstinValid = v.isValid;
        }
        return updated;
      })
    );
  };

  // Counts & stats
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const selected = selectedIndices.size;
    const validGst = parsedRows.filter((r) => r.gstinValid === true).length;
    const duplicates = parsedRows.filter((r) => r.isDuplicate).length;
    return { total, selected, validGst, duplicates };
  }, [parsedRows, selectedIndices]);

  // Execute Final Batch Import
  const handleExecuteImport = () => {
    if (selectedIndices.size === 0) {
      alert('Please select at least one customer row to import.');
      return;
    }

    const rowsToImport = parsedRows.filter((_, i) => selectedIndices.has(i));
    let finalCustomersList = [...existingCustomers];
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    rowsToImport.forEach((row) => {
      const existingIdx = finalCustomersList.findIndex(
        (c) =>
          (c.name && row.name && c.name.toLowerCase().trim() === row.name.toLowerCase().trim()) ||
          (c.gstin && row.gstin && c.gstin.toUpperCase().trim() === row.gstin.toUpperCase().trim())
      );

      if (existingIdx !== -1) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
        } else if (duplicateStrategy === 'update') {
          finalCustomersList[existingIdx] = {
            ...finalCustomersList[existingIdx],
            name: row.name.trim(),
            type: row.type || finalCustomersList[existingIdx].type,
            phone: row.phone || finalCustomersList[existingIdx].phone,
            email: row.email || finalCustomersList[existingIdx].email,
            gstin: row.gstin.toUpperCase().trim() || finalCustomersList[existingIdx].gstin,
            address: row.address || finalCustomersList[existingIdx].address,
            notes: row.notes || finalCustomersList[existingIdx].notes,
            updatedAt: new Date().toISOString(),
          };
          updatedCount++;
        } else {
          // keep_both
          finalCustomersList.unshift({
            id: uuidv4(),
            name: row.name.trim(),
            type: row.type || 'Customer',
            phone: row.phone || '',
            email: row.email || '',
            gstin: row.gstin.toUpperCase().trim() || '',
            address: row.address || '',
            notes: row.notes || '',
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      } else {
        finalCustomersList.unshift({
          id: uuidv4(),
          name: row.name.trim(),
          type: row.type || 'Customer',
          phone: row.phone || '',
          email: row.email || '',
          gstin: row.gstin.toUpperCase().trim() || '',
          address: row.address || '',
          notes: row.notes || '',
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      }
    });

    onConfirmImport(finalCustomersList);
    alert(`✓ Import Complete!\n• Total Parties Processed: ${rowsToImport.length}\n• Added New: ${addedCount}\n• Updated: ${updatedCount}\n• Skipped: ${skippedCount}`);
  };

  return (
    <div className="card shadow-sm border-0 animate-fade-in mb-4">
      {/* Top Banner Header */}
      <div className="card-header bg-success text-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-4">📊</span>
          <div>
            <h2 className="h5 mb-0 fw-bold text-white">Import Customers &amp; Chart of Accounts (Excel / Busy / Tally)</h2>
            <small className="text-white-50">
              Bulk import hundreds of customer accounts, Sundry Debtors, Opening Balances, and GSTINs directly from spreadsheets or ERP HTML exports.
            </small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-light btn-sm fw-semibold" onClick={onCancel}>
            ← Back to Customer Directory
          </button>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Step 1: File Upload & Template Download Cards */}
        <div className="row g-4 mb-4">
          {/* Left: Drag & Drop Zone */}
          <div className="col-lg-7">
            <div className="h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">Step 1: Upload File (.xlsx, .xls, .csv, .html)</span>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => setPasteMode((p) => !p)}
                >
                  {pasteMode ? '📁 Switch to File Upload' : '📋 Or Paste Table HTML / TSV Text'}
                </button>
              </div>

              {!pasteMode ? (
                <div
                  className={`p-4 border rounded-3 text-center flex-grow-1 d-flex flex-column justify-content-center align-items-center transition-all ${
                    dragOver ? 'border-success bg-success-subtle' : 'border-dashed bg-light'
                  }`}
                  style={{
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                    cursor: 'pointer',
                    minHeight: '180px',
                    borderColor: dragOver ? '#198754' : '#94a3b8',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv, .html, .htm, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="d-none"
                  />
                  <div className="fs-1 mb-1 text-success">📂</div>
                  <h6 className="fw-bold mb-1">
                    Click to browse or Drag &amp; Drop Chart of Accounts file here
                  </h6>
                  <p className="text-muted small mb-2">
                    Supports Microsoft Excel (.xlsx, .xls), Busy/Tally HTML tables, and standard CSV files.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-bold px-3 shadow-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    📥 Select File (.xlsx / .xls / .csv / .html)
                  </button>
                </div>
              ) : (
                <div className="p-3 border rounded bg-light flex-grow-1 d-flex flex-column">
                  <label className="form-label small fw-bold text-muted mb-1">
                    Paste HTML Table or Excel Copied Rows (Ctrl+V) here:
                  </label>
                  <textarea
                    className="form-control font-monospace small flex-grow-1 mb-2"
                    rows="6"
                    placeholder="<TABLE>... or Name&#9;Group Name&#9;GST No.&#10;AAKSH&#9;Sundry Debtors&#9;09ARGPM9069G1Z9"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-bold align-self-end px-3"
                    onClick={handleParsePastedData}
                  >
                    ⚡ Process Pasted Data
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sample Templates & Rules */}
          <div className="col-lg-5">
            <div className="card h-100 bg-light border-0 shadow-xs p-3">
              <h6 className="fw-bold text-dark mb-2">📥 Supported ERP &amp; Excel Formats</h6>
              <p className="text-muted small mb-3">
                Pre-configured to seamlessly recognize Busy &amp; Tally &ldquo;Chart of Accounts&rdquo; columns (Name, Alias, Group Name, Opening Bal., GST No., Tel. No., PrintName):
              </p>
              <div className="d-flex gap-2 flex-wrap mb-3">
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm fw-bold d-flex align-items-center gap-1 shadow-xs"
                  onClick={downloadSampleExcel}
                >
                  <span>📊</span> Download Template (.XLSX)
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm fw-semibold d-flex align-items-center gap-1 shadow-xs"
                  onClick={downloadSampleCsv}
                >
                  <span>📄</span> Download CSV (.CSV)
                </button>
              </div>
              <div className="border-top pt-2 small text-muted">
                <div className="fw-semibold text-dark mb-1">💡 Smart Automation:</div>
                <ul className="ps-3 mb-0" style={{ fontSize: '11.5px', lineHeight: '1.45' }}>
                  <li><strong>Sundry Debtors</strong> auto-mapped to Customer (Sales).</li>
                  <li><strong>Sundry Creditors</strong> auto-mapped to Vendor (Purchase).</li>
                  <li><strong>State Auto-Detected</strong> from 2-digit GSTIN prefix.</li>
                  <li><strong>Opening Balances</strong> preserved in customer ledger notes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Live Preview & Batch Configuration (Visible once file is parsed) */}
        {parsedRows.length > 0 && (
          <div className="border-top pt-4 mt-2">
            {/* Import Controls Bar */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3 p-3 bg-light rounded border">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div>
                  <span className="badge bg-primary fs-6 me-2">
                    {stats.selected} / {stats.total} Selected
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success me-2">
                    ✓ {stats.validGst} Valid GSTINs
                  </span>
                  {stats.duplicates > 0 && (
                    <span className="badge bg-warning-subtle text-warning border border-warning">
                      ⚠️ {stats.duplicates} Duplicate Matches
                    </span>
                  )}
                </div>

                {/* Default Category Switcher */}
                <div className="d-flex align-items-center gap-2">
                  <label className="small fw-bold text-muted mb-0">Default Type:</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '130px' }}
                    value={defaultPartyType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDefaultPartyType(val);
                      setParsedRows((prev) => prev.map((r) => ({ ...r, type: val })));
                    }}
                  >
                    <option value="Customer">Customer</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                {/* Duplicate Strategy Switcher */}
                <div className="d-flex align-items-center gap-2">
                  <label className="small fw-bold text-muted mb-0">Duplicate Handling:</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '180px' }}
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value)}
                  >
                    <option value="skip">Skip Existing</option>
                    <option value="update">Update / Overwrite Existing</option>
                    <option value="keep_both">Add As New Entry</option>
                  </select>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={toggleSelectAll}
                >
                  {selectedIndices.size === parsedRows.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold px-4 shadow-sm"
                  onClick={handleExecuteImport}
                >
                  💾 Confirm &amp; Import ({stats.selected} Parties)
                </button>
              </div>
            </div>

            {/* Parsed Rows Interactive Table */}
            <div className="table-responsive border rounded shadow-xs" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="table table-hover table-sm mb-0 align-middle text-start" style={{ fontSize: '12px' }}>
                <thead className="table-dark sticky-top" style={{ zIndex: 5 }}>
                  <tr>
                    <th style={{ width: '40px' }} className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIndices.size === parsedRows.length && parsedRows.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ width: '40px' }} className="text-center">#</th>
                    <th style={{ minWidth: '180px' }}>Party / Business Name</th>
                    <th style={{ width: '110px' }}>Type</th>
                    <th style={{ width: '130px' }}>Phone / Mobile</th>
                    <th style={{ width: '160px' }}>GSTIN Number</th>
                    <th style={{ minWidth: '180px' }}>Billing Address / State</th>
                    <th style={{ minWidth: '150px' }}>Opening Bal / Notes</th>
                    <th style={{ width: '120px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => {
                    const isChecked = selectedIndices.has(idx);
                    return (
                      <tr
                        key={row.id || idx}
                        className={row.isDuplicate ? 'table-warning' : isChecked ? '' : 'table-light text-muted opacity-75'}
                      >
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(idx)}
                          />
                        </td>
                        <td className="text-center text-muted font-monospace">{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm fw-semibold"
                            value={row.name}
                            onChange={(e) => updateRowField(idx, 'name', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={row.type}
                            onChange={(e) => updateRowField(idx, 'type', e.target.value)}
                          >
                            <option value="Customer">Customer</option>
                            <option value="Vendor">Vendor</option>
                            <option value="Both">Both</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row.phone}
                            onChange={(e) => updateRowField(idx, 'phone', e.target.value)}
                            placeholder="Mobile / Tel"
                          />
                        </td>
                        <td>
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control text-uppercase font-monospace"
                              value={row.gstin}
                              onChange={(e) => updateRowField(idx, 'gstin', e.target.value.toUpperCase())}
                              placeholder="15-digit GSTIN"
                            />
                            {row.gstinValid === true && (
                              <span className="input-group-text bg-success text-white py-0 px-1" title="Valid GSTIN checksum">
                                ✓
                              </span>
                            )}
                            {row.gstinValid === false && (
                              <span className="input-group-text bg-danger text-white py-0 px-1" title="Invalid GSTIN checksum format">
                                ✕
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row.address}
                            onChange={(e) => updateRowField(idx, 'address', e.target.value)}
                            placeholder="Address, State"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row.notes}
                            onChange={(e) => updateRowField(idx, 'notes', e.target.value)}
                            placeholder="Opening Bal / Remarks"
                          />
                        </td>
                        <td>
                          {row.isDuplicate ? (
                            <span className="badge bg-warning text-dark border">
                              ⚠️ {row.duplicateReason || 'Duplicate'}
                            </span>
                          ) : row.gstinValid === true ? (
                            <span className="badge bg-success-subtle text-success border border-success">
                              ✓ Verified GST
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Final Action Button */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                {fileData?.fileName ? `Loaded: ${fileData.fileName} (${parsedRows.length} accounts)` : ''}
              </span>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success fw-bold px-4 shadow-sm"
                  onClick={handleExecuteImport}
                >
                  🚀 Batch Import {stats.selected} Accounts into Directory
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerExcelImport;
