import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { GST_UNITS, DEFAULT_UNIT } from '../../constants/units.js';
import { validateHSN } from '../../services/hsnValidator.js';

// Helper to normalize unit string to valid GST unit code
function normalizeUnit(rawUnit) {
  if (!rawUnit) return DEFAULT_UNIT;
  const clean = String(rawUnit).trim().toUpperCase();

  // Direct match
  const direct = GST_UNITS.find((u) => u.code === clean);
  if (direct) return direct.code;

  // Common variations
  const lower = String(rawUnit).toLowerCase().trim();
  if (lower.startsWith('piece') || lower === 'pcs' || lower === 'pc') return 'PCS';
  if (lower.startsWith('number') || lower === 'nos' || lower === 'no') return 'NOS';
  if (lower.startsWith('box') || lower === 'bxs') return 'BOX';
  if (lower.startsWith('kilo') || lower === 'kgs' || lower === 'kg') return 'KGS';
  if (lower.startsWith('meter') || lower === 'mtr' || lower === 'm') return 'MTR';
  if (lower.startsWith('packet') || lower === 'pkt' || lower === 'pack') return 'PKT';
  if (lower.startsWith('set')) return 'SET';
  if (lower.startsWith('bag')) return 'BAG';
  if (lower.startsWith('litre') || lower.startsWith('liter') || lower === 'ltr' || lower === 'lt') return 'LTR';
  if (lower.startsWith('dozen') || lower === 'doz') return 'DOZ';
  if (lower.startsWith('bottle') || lower === 'btl') return 'BTL';
  if (lower.startsWith('can')) return 'CAN';
  if (lower.startsWith('roll') || lower === 'rol') return 'ROL';
  if (lower.startsWith('bundle') || lower === 'bdl') return 'BDL';
  if (lower.startsWith('unit') || lower === 'unt') return 'UNT';
  if (lower.startsWith('laddi') || lower.startsWith('strip')) return 'Laddi';
  if (lower.startsWith('quintal') || lower === 'qtl') return 'QTL';
  if (lower.startsWith('ton')) return 'TON';
  if (lower.includes('sq') && lower.includes('f')) return 'SQF';
  if (lower.includes('sq') && lower.includes('m')) return 'SQM';

  return DEFAULT_UNIT;
}

// Helper to parse HTML tables directly from ERP exports (Busy, Tally, Marg)
function parseHtmlTableToRows(htmlString) {
  try {
    if (!htmlString || typeof htmlString !== 'string' || !htmlString.includes('<')) return null;

    const decodeEntities = (str) => {
      if (!str) return '';
      return str
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
    };

    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const thTdRegex = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;

    const rawRows = [];
    let trMatch;
    while ((trMatch = trRegex.exec(htmlString)) !== null) {
      const rowHtml = trMatch[1];
      const cells = [];
      let cellMatch;
      while ((cellMatch = thTdRegex.exec(rowHtml)) !== null) {
        const inner = cellMatch[1]
          .replace(/<br\s*\/?>/gi, ', ')
          .replace(/<\/(p|div|li)>/gi, ', ')
          .replace(/<[^>]+>/g, ' ');
        const text = decodeEntities(inner)
          .replace(/[\r\n\t]+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        cells.push(text);
      }
      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        rawRows.push(cells);
      }
    }

    if (rawRows.length === 0 && typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const trElements = Array.from(doc.querySelectorAll('tr'));
      for (const tr of trElements) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map((c) => {
          c.querySelectorAll('br').forEach((b) => b.replaceWith(document.createTextNode(', ')));
          return decodeEntities(c.textContent)
            .replace(/[\r\n\t]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        });
        if (cells.length > 0 && cells.some((c) => c.length > 0)) {
          rawRows.push(cells);
        }
      }
    }

    if (rawRows.length === 0) return null;

    // Detect header row by matching standard accounting/inventory keywords
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i];
      if (row.some((c) => /item|product|description|name|hsn|rate|price|unit|category|mrp|cost|stock/i.test(c))) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = headerRowIdx >= 0 ? rawRows[headerRowIdx] : rawRows[0];
    const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;

    const result = [];
    for (let i = dataStart; i < rawRows.length; i++) {
      const cells = rawRows[i];
      if (cells.length === 0 || cells.every((c) => !c)) continue;

      const rowObj = {};
      headers.forEach((h, col) => {
        if (h) rowObj[h] = cells[col] || '';
      });
      cells.forEach((val, col) => {
        if (!headers[col]) rowObj[`col_${col}`] = val;
      });

      const itemName = rowObj['Name'] || rowObj['Item Name'] || rowObj['Description'] || cells[0] || '';
      if (itemName && itemName.trim() && itemName.toLowerCase() !== 'name' && itemName.toLowerCase() !== 'item') {
        result.push(rowObj);
      }
    }

    return result.length > 0 ? result : null;
  } catch (err) {
    console.warn('HTML parser notice:', err);
    return null;
  }
}

function ItemExcelImport({ existingItems = [], onConfirmImport, onCancel }) {
  const [parsedRows, setParsedRows] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'update' | 'keep_both'
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const fileInputRef = useRef(null);

  // Download Sample Excel Template (.xlsx)
  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Item Name': 'Wireless Optical Mouse 2.4GHz',
        'HSN Code': '8471',
        'Category': 'Electronics',
        'Subcategory': 'Computer Peripherals',
        'Sales Price': 450,
        'Wholesale Price': 380,
        'MRP': 699,
        'Purchase Price': 290,
        'Unit': 'PCS',
        'Opening Stock': 40,
        'GST Rate (%)': 18,
      },
      {
        'Item Name': 'USB-C Fast Charger 65W GaN',
        'HSN Code': '8504',
        'Category': 'Electronics',
        'Subcategory': 'Mobile Accessories',
        'Sales Price': 850,
        'Wholesale Price': 720,
        'MRP': 1299,
        'Purchase Price': 480,
        'Unit': 'PCS',
        'Opening Stock': 25,
        'GST Rate (%)': 18,
      },
      {
        'Item Name': 'A4 Copier Paper 75GSM (Ream of 500)',
        'HSN Code': '4802',
        'Category': 'Stationery',
        'Subcategory': 'Office Paper',
        'Sales Price': 290,
        'Wholesale Price': 260,
        'MRP': 350,
        'Purchase Price': 220,
        'Unit': 'BOX',
        'Opening Stock': 100,
        'GST Rate (%)': 12,
      },
      {
        'Item Name': 'LED Light Bulb 9W Cool Day',
        'HSN Code': '8539',
        'Category': 'Electrical',
        'Subcategory': 'Lighting',
        'Sales Price': 110,
        'Wholesale Price': 92,
        'MRP': 160,
        'Purchase Price': 72,
        'Unit': 'PCS',
        'Opening Stock': 150,
        'GST Rate (%)': 18,
      },
      {
        'Item Name': 'Insulated Copper Wire 2.5sqmm (90m)',
        'HSN Code': '8544',
        'Category': 'Electrical',
        'Subcategory': 'Wires & Cables',
        'Sales Price': 1850,
        'Wholesale Price': 1680,
        'MRP': 2200,
        'Purchase Price': 1450,
        'Unit': 'ROL',
        'Opening Stock': 15,
        'GST Rate (%)': 18,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 36 }, // Item Name
      { wch: 12 }, // HSN Code
      { wch: 18 }, // Category
      { wch: 22 }, // Subcategory
      { wch: 14 }, // Sales Price
      { wch: 16 }, // Wholesale Price
      { wch: 12 }, // MRP
      { wch: 16 }, // Purchase Price
      { wch: 10 }, // Unit
      { wch: 14 }, // Opening Stock
      { wch: 14 }, // GST Rate
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items_Catalog');
    XLSX.writeFile(workbook, 'Tread_Items_Import_Template.xlsx');
  };

  // Download Sample CSV Template (.csv)
  const downloadSampleCsv = () => {
    const sample = `Item Name,HSN Code,Category,Subcategory,Sales Price,Wholesale Price,MRP,Purchase Price,Unit,Opening Stock,GST Rate (%)
"Wireless Optical Mouse 2.4GHz","8471","Electronics","Computer Peripherals",450,380,699,290,"PCS",40,18
"USB-C Fast Charger 65W GaN","8504","Electronics","Mobile Accessories",850,720,1299,480,"PCS",25,18
"A4 Copier Paper 75GSM (Ream of 500)","4802","Stationery","Office Paper",290,260,350,220,"BOX",100,12
"LED Light Bulb 9W Cool Day","8539","Electrical","Lighting",110,92,160,72,"PCS",150,18
"Insulated Copper Wire 2.5sqmm (90m)","8544","Electrical","Wires & Cables",1850,1680,2200,1450,"ROL",15,18`;

    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Tread_Items_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Smart fuzzy header extractor for Item rows
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

    // 1. Item Name / Description
    const name = findVal([
      'itemname',
      'itemdescription',
      'description',
      'productname',
      'product',
      'particulars',
      'name',
      'item',
      'title',
    ]);

    // 2. HSN / SAC Code
    const rawHsn = findVal([
      'hsncode',
      'hsnsaccode',
      'hsnsac',
      'saccode',
      'hsn',
      'sac',
      'commoditycode',
    ]).replace(/[^0-9]/g, '');

    // 3. Category (Main Group)
    const category = findVal([
      'productcategory',
      'itemcategory',
      'category',
      'itemgroup',
      'groupname',
      'group',
      'family',
      'maincategory',
    ]);

    // 4. Subcategory
    const subcategory = findVal([
      'subcategory',
      'subcat',
      'subgroupname',
      'subgroup',
      'subitem',
      'subtype',
      'itemtype',
      'type',
    ]);

    // 5. Unit (UOM)
    const rawUnit = findVal([
      'unitofmeasure',
      'uom',
      'qtyunit',
      'unit',
      'packing',
      'measurement',
    ]);
    const unit = normalizeUnit(rawUnit);

    // 6. Sales Price (Retail / Standard Selling Rate)
    const rawRate = findVal([
      'saleprice',
      'salesprice',
      'sellingprice',
      'retailprice',
      'unitrate',
      'salerate',
      'pricea',
      'stdrate',
      'rate',
      'price',
    ]);
    const rate = Math.max(0, parseFloat(String(rawRate).replace(/[^0-9.]/g, '')) || 0);

    // 7. Wholesale Price (Tier-B / Trade Rate)
    const rawWholesale = findVal([
      'wholesaleprice',
      'wholesalerate',
      'dealerprice',
      'dealerrate',
      'priceb',
      'tradeprice',
      'distributorprice',
      'wsrate',
      'wsprice',
    ]);
    const wholesalePrice = Math.max(0, parseFloat(String(rawWholesale).replace(/[^0-9.]/g, '')) || 0);

    // 8. MRP (Maximum Retail Price)
    const rawMrp = findVal([
      'maxretailprice',
      'maximumretailprice',
      'retailmrp',
      'mrp',
    ]);
    const mrp = Math.max(0, parseFloat(String(rawMrp).replace(/[^0-9.]/g, '')) || 0);

    // 9. Purchase Price (Cost / Inward Rate)
    const rawPurchase = findVal([
      'purchaseprice',
      'purchaserate',
      'costprice',
      'costrate',
      'buyprice',
      'buyrate',
      'inwardrate',
      'cost',
      'purchase',
    ]);
    const purchasePrice = Math.max(0, parseFloat(String(rawPurchase).replace(/[^0-9.]/g, '')) || 0);

    // 10. Opening Stock Quantity
    const rawStock = findVal([
      'openingstock',
      'availablestock',
      'closingstock',
      'openingqty',
      'balqty',
      'stock',
      'quantity',
      'qty',
      'available',
    ]);
    const stock = Math.max(0, parseFloat(String(rawStock).replace(/[^0-9.]/g, '')) || 0);

    // 11. GST Slab
    const rawGst = findVal([
      'gstpercent',
      'gstpct',
      'taxrate',
      'taxpercent',
      'gstslab',
      'igst',
      'gst',
      'tax',
    ]);
    const parsedGst = parseFloat(String(rawGst).replace(/[^0-9.]/g, ''));
    const validSlabs = [0, 5, 12, 18, 28];
    const gst = !isNaN(parsedGst) && validSlabs.includes(parsedGst)
      ? parsedGst
      : 18;

    // HSN Validation
    let hsnValid = null;
    let hsnAnalysis = null;
    if (rawHsn) {
      hsnAnalysis = validateHSN(rawHsn);
      hsnValid = hsnAnalysis.isValid;
    }

    // Duplicate Check against existing catalog
    const existsByName = existingItems.some(
      (i) => i.name && name && i.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    const existsByHsn = Boolean(
      rawHsn && existingItems.some((i) => i.hsn && i.hsn.trim() === rawHsn.trim())
    );

    return {
      index,
      id: uuidv4(),
      name: name || `Imported Item #${index + 1}`,
      hsn: rawHsn || '',
      category: category || '',
      subcategory: subcategory || '',
      unit: unit || DEFAULT_UNIT,
      rate,
      wholesalePrice: wholesalePrice || 0,
      mrp: mrp || 0,
      purchasePrice: purchasePrice || 0,
      stock,
      gst,
      hsnValid,
      hsnAnalysis,
      isDuplicate: existsByName || existsByHsn,
      duplicateReason: existsByName ? 'Matching Product Name' : existsByHsn ? 'Matching HSN Code' : null,
      selected: Boolean(name && name.trim() && name.toLowerCase() !== 'name' && name.toLowerCase() !== 'item'),
    };
  };

  // Process Excel / CSV / HTML buffer
  const processExcelBuffer = (bufferOrText) => {
    try {
      let json = [];

      // Check if input is HTML (e.g. from Busy/Tally export)
      let textContent = null;
      if (typeof bufferOrText === 'string') {
        textContent = bufferOrText;
      } else if (bufferOrText) {
        try {
          const decoder = new TextDecoder('utf-8');
          const slice = bufferOrText.slice ? bufferOrText.slice(0, 4096) : new Uint8Array(bufferOrText, 0, 4096);
          const peek = decoder.decode(slice);
          if (/<(?:html|table|tr|body|head|font|tbody)/i.test(peek)) {
            textContent = decoder.decode(bufferOrText);
          }
        } catch {
          // Continue to SheetJS
        }
      }

      if (textContent && textContent.includes('<')) {
        const htmlRows = parseHtmlTableToRows(textContent);
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

        // Read raw rows as array-of-arrays first to detect header row location
        const rawAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const HEADER_KEYWORDS = /item|name|product|description|hsn|rate|price|unit|category|subcat|mrp|cost|stock|qty|gst|tax/i;
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rawAoa.length, 10); i++) {
          const row = rawAoa[i];
          const matchCount = row.filter((cell) =>
            cell && HEADER_KEYWORDS.test(String(cell).trim())
          ).length;
          if (matchCount >= 2) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx >= 0) {
          const headers = rawAoa[headerRowIdx].map((h) => String(h).trim());
          json = rawAoa.slice(headerRowIdx + 1)
            .filter((row) => row.some((cell) => cell !== '' && cell !== null && cell !== undefined))
            .map((row) => {
              const obj = {};
              headers.forEach((h, colIdx) => {
                if (h) obj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
              });
              return obj;
            });
        } else {
          json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }
      }

      if (!Array.isArray(json) || json.length === 0) {
        alert('No data rows found in this file. Please check the spreadsheet format.');
        return;
      }

      const rows = json
        .map((r, i) => normalizeRowData(r, i))
        .filter((r) => r.name && r.name.toLowerCase() !== 'name' && r.name.toLowerCase() !== 'item' && r.name !== 'Item Master');

      setParsedRows(rows);

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
      reader.onload = (evt) => processExcelBuffer(evt.target.result, file.name);
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
    if (!file) return;

    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
    const reader = new FileReader();
    if (isHtml) {
      reader.onload = (evt) => processExcelBuffer(evt.target.result, file.name);
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        const buffer = new Uint8Array(evt.target.result);
        processExcelBuffer(buffer, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleParsePastedData = () => {
    if (!pastedText.trim()) {
      alert('Please paste spreadsheet data or HTML table first.');
      return;
    }
    processExcelBuffer(pastedText, 'Pasted Spreadsheet Data');
    setPasteMode(false);
  };

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

  const updateRowField = (idx, field, value) => {
    setParsedRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'hsn') {
          const v = validateHSN(value);
          updated.hsnValid = v.isValid;
          updated.hsnAnalysis = v;
        }
        return updated;
      })
    );
  };

  const stats = useMemo(() => {
    const total = parsedRows.length;
    const selected = selectedIndices.size;
    const validHsn = parsedRows.filter((r) => r.hsnValid === true).length;
    const duplicates = parsedRows.filter((r) => r.isDuplicate).length;
    return { total, selected, validHsn, duplicates };
  }, [parsedRows, selectedIndices]);

  const displayedRows = useMemo(() => {
    if (!filterSearch.trim()) return parsedRows;
    const q = filterSearch.toLowerCase().trim();
    return parsedRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.hsn.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.subcategory.toLowerCase().includes(q)
    );
  }, [parsedRows, filterSearch]);

  // Execute Batch Item Import
  const handleExecuteImport = () => {
    if (selectedIndices.size === 0) {
      alert('Please select at least one item to import.');
      return;
    }

    const rowsToImport = parsedRows.filter((_, i) => selectedIndices.has(i));
    let finalItemsList = [...existingItems];
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    rowsToImport.forEach((row) => {
      const existingIdx = finalItemsList.findIndex(
        (item) => item.name && row.name && item.name.toLowerCase().trim() === row.name.toLowerCase().trim()
      );

      if (existingIdx !== -1) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
        } else if (duplicateStrategy === 'update') {
          finalItemsList[existingIdx] = {
            ...finalItemsList[existingIdx],
            name: row.name.trim(),
            hsn: row.hsn.trim(),
            category: row.category || finalItemsList[existingIdx].category || '',
            subcategory: row.subcategory || finalItemsList[existingIdx].subcategory || '',
            unit: row.unit || finalItemsList[existingIdx].unit || DEFAULT_UNIT,
            rate: Number(row.rate) || finalItemsList[existingIdx].rate || 0,
            wholesalePrice: Number(row.wholesalePrice) || finalItemsList[existingIdx].wholesalePrice || 0,
            mrp: Number(row.mrp) || finalItemsList[existingIdx].mrp || 0,
            purchasePrice: Number(row.purchasePrice) || finalItemsList[existingIdx].purchasePrice || 0,
            stock: Number(row.stock) || finalItemsList[existingIdx].stock || 0,
            gst: !isNaN(Number(row.gst)) ? Number(row.gst) : (finalItemsList[existingIdx].gst || 18),
            updatedAt: new Date().toISOString(),
          };
          updatedCount++;
        } else {
          // keep_both
          finalItemsList.unshift({
            id: uuidv4(),
            name: row.name.trim(),
            hsn: row.hsn.trim(),
            category: row.category || '',
            subcategory: row.subcategory || '',
            unit: row.unit || DEFAULT_UNIT,
            rate: Number(row.rate) || 0,
            wholesalePrice: Number(row.wholesalePrice) || 0,
            mrp: Number(row.mrp) || 0,
            purchasePrice: Number(row.purchasePrice) || 0,
            stock: Number(row.stock) || 0,
            gst: Number(row.gst) || 18,
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      } else {
        finalItemsList.unshift({
          id: uuidv4(),
          name: row.name.trim(),
          hsn: row.hsn.trim(),
          category: row.category || '',
          subcategory: row.subcategory || '',
          unit: row.unit || DEFAULT_UNIT,
          rate: Number(row.rate) || 0,
          wholesalePrice: Number(row.wholesalePrice) || 0,
          mrp: Number(row.mrp) || 0,
          purchasePrice: Number(row.purchasePrice) || 0,
          stock: Number(row.stock) || 0,
          gst: Number(row.gst) || 18,
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      }
    });

    onConfirmImport(finalItemsList);
    alert(
      `✓ Items Import Complete!\n• Total Rows Processed: ${rowsToImport.length}\n• Added New Items: ${addedCount}\n• Updated Items: ${updatedCount}\n• Skipped: ${skippedCount}`
    );
  };

  return (
    <div className="card shadow-sm border-0 animate-fade-in mb-4">
      {/* Top Banner Header */}
      <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-4">📊</span>
          <div>
            <h2 className="h5 mb-0 fw-bold text-white">Import Items from Excel / CSV (HSN, Subcategories & Multi-Price)</h2>
            <small className="text-white-50">
              Bulk import product catalog with HSN/SAC codes, categories, subcategories, sales prices, wholesale prices, MRP, purchase prices, and units.
            </small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-light btn-sm fw-semibold" onClick={onCancel}>
            ✕ Close Importer
          </button>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Step 1: Upload / Drop Zone or Paste */}
        <div className="row g-4 mb-4">
          {/* Left: Drag & Drop Area */}
          <div className="col-lg-7">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold small text-uppercase text-muted">Select Input Source</span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${!pasteMode ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setPasteMode(false)}
                >
                  📁 Upload File (.xlsx / .csv)
                </button>
                <button
                  type="button"
                  className={`btn ${pasteMode ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setPasteMode(true)}
                >
                  📋 Paste from Clipboard
                </button>
              </div>
            </div>

            <div className="h-100 d-flex flex-column">
              {!pasteMode ? (
                <div
                  className={`border-2 border-dashed rounded p-4 text-center d-flex flex-column justify-content-center align-items-center flex-grow-1 ${
                    dragOver ? 'border-primary bg-primary-subtle' : 'border-secondary-subtle bg-light'
                  }`}
                  style={{ minHeight: '190px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="d-none"
                    accept=".xlsx, .xls, .csv, .html, .htm"
                    onChange={handleFileUpload}
                  />
                  <div className="display-6 mb-2">📥</div>
                  <h6 className="fw-bold mb-1 text-dark">
                    Drag &amp; Drop your Excel (.xlsx, .xls) or CSV file here
                  </h6>
                  <p className="text-muted small mb-2">
                    Supports Microsoft Excel, Google Sheets, Busy, Tally, Marg ERP files.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary fw-bold px-3 shadow-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    📂 Browse Files (.xlsx / .xls / .csv / .html)
                  </button>
                </div>
              ) : (
                <div className="p-3 border rounded bg-light flex-grow-1 d-flex flex-column">
                  <label className="form-label small fw-bold text-muted mb-1">
                    Paste Excel Rows (Ctrl+V) or HTML Table here:
                  </label>
                  <textarea
                    className="form-control font-monospace small flex-grow-1 mb-2"
                    rows="6"
                    placeholder="Item Name&#9;HSN&#9;Category&#9;Subcategory&#9;Sales Price&#9;Wholesale Price&#9;Purchase Price&#9;Unit&#10;Wireless Mouse&#9;8471&#9;Electronics&#9;Accessories&#9;450&#9;380&#9;290&#9;PCS"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary fw-bold align-self-end px-3"
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
              <h6 className="fw-bold text-dark mb-2">📥 Download Ready-To-Use Item Templates</h6>
              <p className="text-muted small mb-3">
                Pre-configured with columns for HSN Code, Category, Subcategory, Multi-tier Sales Prices, Purchase Price, and Unit (UOM):
              </p>
              <div className="d-flex gap-2 flex-wrap mb-3">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm fw-bold d-flex align-items-center gap-1 shadow-xs"
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
                <div className="fw-semibold text-dark mb-1">💡 Smart Features &amp; Multi-Price Support:</div>
                <ul className="ps-3 mb-0" style={{ fontSize: '11.5px', lineHeight: '1.45' }}>
                  <li><strong>Multiple Prices:</strong> Maps Retail Rate, Wholesale Rate, MRP, and Purchase Cost.</li>
                  <li><strong>HSN Verification:</strong> Auto-validates 2, 4, 6, and 8 digit HSN/SAC codes.</li>
                  <li><strong>Subcategories:</strong> Supports 2-tier classification (Category → Subcategory).</li>
                  <li><strong>Auto UOM Normalizer:</strong> Matches PCS, NOS, KGS, BOX, MTR, PKT, etc. automatically.</li>
                  <li><strong>Duplicate Prevention:</strong> Detects existing items by name with Skip / Overwrite options.</li>
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
                    ✓ {stats.validHsn} Valid HSNs
                  </span>
                  {stats.duplicates > 0 && (
                    <span className="badge bg-warning-subtle text-warning border border-warning">
                      ⚠️ {stats.duplicates} Duplicate Names
                    </span>
                  )}
                </div>

                {/* Duplicate Strategy Switcher */}
                <div className="d-flex align-items-center gap-2">
                  <label className="small fw-bold text-muted mb-0">Duplicate Handling:</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '190px' }}
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value)}
                  >
                    <option value="skip">Skip Existing Items</option>
                    <option value="update">Update / Overwrite Existing</option>
                    <option value="keep_both">Add As New Entry</option>
                  </select>
                </div>

                {/* Quick Search in Preview */}
                <div style={{ width: '200px' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="🔍 Filter preview..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
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
                  💾 Confirm &amp; Import ({stats.selected} Items)
                </button>
              </div>
            </div>

            {/* Parsed Rows Interactive Table */}
            <div className="table-responsive border rounded shadow-xs" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="table table-hover table-sm mb-0 align-middle text-start" style={{ fontSize: '11.5px' }}>
                <thead className="table-dark sticky-top" style={{ zIndex: 5 }}>
                  <tr>
                    <th style={{ width: '38px' }} className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIndices.size === parsedRows.length && parsedRows.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ width: '35px' }} className="text-center">#</th>
                    <th style={{ minWidth: '190px' }}>Item Name / Description</th>
                    <th style={{ width: '100px' }}>HSN Code</th>
                    <th style={{ minWidth: '120px' }}>Category</th>
                    <th style={{ minWidth: '130px' }}>Subcategory</th>
                    <th style={{ width: '90px' }}>Unit</th>
                    <th style={{ width: '100px' }} className="text-end">Sale Price (₹)</th>
                    <th style={{ width: '100px' }} className="text-end">Wholesale (₹)</th>
                    <th style={{ width: '90px' }} className="text-end">MRP (₹)</th>
                    <th style={{ width: '100px' }} className="text-end">Purchase (₹)</th>
                    <th style={{ width: '75px' }} className="text-center">Stock</th>
                    <th style={{ width: '75px' }} className="text-center">GST %</th>
                    <th style={{ width: '95px' }} className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((row) => {
                    const originalIdx = row.index;
                    const isChecked = selectedIndices.has(originalIdx);
                    return (
                      <tr
                        key={row.id || originalIdx}
                        className={row.isDuplicate ? 'table-warning' : isChecked ? '' : 'table-light text-muted opacity-75'}
                      >
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(originalIdx)}
                          />
                        </td>
                        <td className="text-center text-muted font-monospace">{originalIdx + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm fw-semibold"
                            value={row.name}
                            onChange={(e) => updateRowField(originalIdx, 'name', e.target.value)}
                          />
                        </td>
                        <td>
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control font-monospace"
                              value={row.hsn}
                              onChange={(e) => updateRowField(originalIdx, 'hsn', e.target.value)}
                              placeholder="HSN"
                              maxLength={8}
                            />
                            {row.hsnValid === true && (
                              <span className="input-group-text bg-success text-white py-0 px-1" title="Valid HSN code">
                                ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row.category}
                            onChange={(e) => updateRowField(originalIdx, 'category', e.target.value)}
                            placeholder="Category"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row.subcategory}
                            onChange={(e) => updateRowField(originalIdx, 'subcategory', e.target.value)}
                            placeholder="Subcategory"
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={row.unit}
                            onChange={(e) => updateRowField(originalIdx, 'unit', e.target.value)}
                          >
                            {GST_UNITS.map((u) => (
                              <option key={u.code} value={u.code}>
                                {u.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control form-control-sm text-end fw-semibold text-primary"
                            value={row.rate}
                            onChange={(e) => updateRowField(originalIdx, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control form-control-sm text-end"
                            value={row.wholesalePrice || ''}
                            onChange={(e) => updateRowField(originalIdx, 'wholesalePrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control form-control-sm text-end text-muted"
                            value={row.mrp || ''}
                            onChange={(e) => updateRowField(originalIdx, 'mrp', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control form-control-sm text-end text-success"
                            value={row.purchasePrice || ''}
                            onChange={(e) => updateRowField(originalIdx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm text-center"
                            value={row.stock}
                            onChange={(e) => updateRowField(originalIdx, 'stock', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm text-center px-1"
                            value={row.gst}
                            onChange={(e) => updateRowField(originalIdx, 'gst', parseInt(e.target.value) || 0)}
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="text-center">
                          {row.isDuplicate ? (
                            <span className="badge bg-warning text-dark border">
                              ⚠️ Exists
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success border border-success">
                              ✓ New
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Confirm Button Strip */}
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <small className="text-muted">
                Tip: You can edit any item's price, HSN, subcategory, or stock quantity directly in the table above before confirming import.
              </small>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold px-4 shadow-sm"
                  onClick={handleExecuteImport}
                >
                  💾 Confirm &amp; Import ({stats.selected} Items)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemExcelImport;
