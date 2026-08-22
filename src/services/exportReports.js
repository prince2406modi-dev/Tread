/**
 * GSTR-1 & Monthly Sales Export Utilities
 * Exports to Excel (.xls XML / .csv), GSTR-1 JSON, and formatted Print reports.
 */

// Helper to download blob
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Export GSTR-1 & Monthly Sales as an Excel Spreadsheet (.xls XML format)
 * Opens natively in MS Excel, LibreOffice Calc, and Google Sheets with formatted columns.
 */
export function exportToExcel(invoices = [], company = {}, selectedMonth = 'all') {
  const filteredInvoices = selectedMonth === 'all'
    ? invoices
    : invoices.filter((inv) => (inv.invoiceDate || '').startsWith(selectedMonth));

  const monthLabel = selectedMonth === 'all' ? 'All_Periods' : selectedMonth;
  const fileName = `GSTR1_Sales_Report_${company.name ? company.name.replace(/\s+/g, '_') : 'Tread'}_${monthLabel}.xls`;

  // Aggregate monthly
  const monthlyMap = {};
  filteredInvoices.forEach((inv) => {
    const m = (inv.invoiceDate || 'Unknown').slice(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, count: 0, taxable: 0, tax: 0, total: 0 };
    monthlyMap[m].count += 1;
    monthlyMap[m].taxable += inv.totals?.subtotal || 0;
    monthlyMap[m].tax += inv.totals?.totalGst || 0;
    monthlyMap[m].total += inv.totals?.total || 0;
  });

  // Aggregate slabs
  const slabs = { 0: { taxable: 0, tax: 0 }, 5: { taxable: 0, tax: 0 }, 12: { taxable: 0, tax: 0 }, 18: { taxable: 0, tax: 0 }, 28: { taxable: 0, tax: 0 } };
  filteredInvoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const qty = Number(item.quantity ?? 1);
      const rate = Number(item.rate ?? 0);
      const slab = Number(item.gstPercent ?? 0);
      const taxable = qty * rate;
      const tax = (taxable * slab) / 100;
      if (slabs[slab] !== undefined) {
        slabs[slab].taxable += taxable;
        slabs[slab].tax += tax;
      }
    });
  });

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>GSTR-1 Invoices</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
        th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        .num { text-align: right; }
        .center { text-align: center; }
        .title { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
        .sub { font-size: 11pt; color: #475569; }
        .total-row { background-color: #f1f5f9; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="13" class="title">${company.name || 'Company'} — GSTR-1 Sales Report</td></tr>
        <tr><td colspan="13" class="sub">GSTIN: ${company.gstin || 'N/A'} | Period: ${selectedMonth === 'all' ? 'All Recorded Invoices' : selectedMonth} | Generated on: ${new Date().toLocaleDateString('en-IN')}</td></tr>
        <tr><td colspan="13"></td></tr>
        
        <!-- SECTION 1: DETAILED INVOICE-WISE & ITEM-WISE BREAKDOWN -->
        <tr><th colspan="13" style="background-color: #0284c7;">1. Invoice & Item Level Sales Register (B2B & B2C)</th></tr>
        <tr>
          <th>Invoice No</th>
          <th>Invoice Date</th>
          <th>Customer Name</th>
          <th>Customer Phone</th>
          <th>Customer Address</th>
          <th>Item Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price (₹)</th>
          <th class="num">Taxable Value (₹)</th>
          <th class="center">GST Rate (%)</th>
          <th class="num">CGST (₹)</th>
          <th class="num">SGST (₹)</th>
          <th class="num">Invoice Total (₹)</th>
        </tr>
  `;

  let sumTaxable = 0;
  let sumCgst = 0;
  let sumSgst = 0;
  let sumTotal = 0;

  filteredInvoices.forEach((inv) => {
    const invItems = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [{ description: 'General Sale', quantity: 1, rate: inv.totals?.subtotal || 0, gstPercent: 18 }];
    invItems.forEach((item) => {
      const q = Number(item.quantity ?? 1);
      const r = Number(item.rate ?? 0);
      const g = Number(item.gstPercent ?? 0);
      const taxable = q * r;
      const tax = (taxable * g) / 100;
      const cgst = tax / 2;
      const sgst = tax / 2;
      const total = taxable + tax;

      sumTaxable += taxable;
      sumCgst += cgst;
      sumSgst += sgst;
      sumTotal += total;

      html += `
        <tr>
          <td>${inv.invoiceNumber || ''}</td>
          <td>${inv.invoiceDate || ''}</td>
          <td>${inv.customerName || ''}</td>
          <td>${inv.customerPhone || ''}</td>
          <td>${inv.customerAddress || ''}</td>
          <td>${item.description || ''}</td>
          <td class="num">${q}</td>
          <td class="num">${r.toFixed(2)}</td>
          <td class="num">${taxable.toFixed(2)}</td>
          <td class="center">${g}%</td>
          <td class="num">${cgst.toFixed(2)}</td>
          <td class="num">${sgst.toFixed(2)}</td>
          <td class="num">${total.toFixed(2)}</td>
        </tr>
      `;
    });
  });

  html += `
        <tr class="total-row">
          <td colspan="8">TOTAL SALES VALUE</td>
          <td class="num">${sumTaxable.toFixed(2)}</td>
          <td></td>
          <td class="num">${sumCgst.toFixed(2)}</td>
          <td class="num">${sumSgst.toFixed(2)}</td>
          <td class="num">${sumTotal.toFixed(2)}</td>
        </tr>
        <tr><td colspan="13"></td></tr>
        
        <!-- SECTION 2: GSTR-1 TAX SLABS SUMMARY -->
        <tr><th colspan="7" style="background-color: #0284c7;">2. GSTR-1 Rate Slab Summary</th><td colspan="6"></td></tr>
        <tr>
          <th colspan="2">GST Rate Slab</th>
          <th class="num">Taxable Value (₹)</th>
          <th class="num">CGST (₹)</th>
          <th class="num">SGST (₹)</th>
          <th class="num">Total Output GST (₹)</th>
          <th class="num">Gross Total (₹)</th>
          <td colspan="6"></td>
        </tr>
  `;

  [0, 5, 12, 18, 28].forEach((slab) => {
    const s = slabs[slab];
    const cgst = s.tax / 2;
    const sgst = s.tax / 2;
    const total = s.taxable + s.tax;
    html += `
      <tr>
        <td colspan="2">${slab}% GST ${slab === 0 ? '(Exempt/Nil)' : slab === 18 ? '(Standard)' : ''}</td>
        <td class="num">${s.taxable.toFixed(2)}</td>
        <td class="num">${cgst.toFixed(2)}</td>
        <td class="num">${sgst.toFixed(2)}</td>
        <td class="num">${s.tax.toFixed(2)}</td>
        <td class="num">${total.toFixed(2)}</td>
        <td colspan="6"></td>
      </tr>
    `;
  });

  html += `
        <tr><td colspan="13"></td></tr>
        <!-- SECTION 3: MONTHLY SALES BREAKDOWN -->
        <tr><th colspan="6" style="background-color: #0284c7;">3. Monthly Sales Summary</th><td colspan="7"></td></tr>
        <tr>
          <th>Month</th>
          <th class="center">Total Invoices</th>
          <th class="num">Taxable Amount (₹)</th>
          <th class="num">Total GST (₹)</th>
          <th class="num">Total Revenue (₹)</th>
          <td colspan="8"></td>
        </tr>
  `;

  Object.values(monthlyMap).forEach((m) => {
    html += `
      <tr>
        <td>${m.month}</td>
        <td class="center">${m.count}</td>
        <td class="num">${m.taxable.toFixed(2)}</td>
        <td class="num">${m.tax.toFixed(2)}</td>
        <td class="num">${m.total.toFixed(2)}</td>
        <td colspan="8"></td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  downloadFile(html, fileName, 'application/vnd.ms-excel');
}

/**
 * 2. Export GSTR-1 as CSV (Comma Separated Values)
 */
export function exportToCSV(invoices = [], company = {}, selectedMonth = 'all') {
  const filteredInvoices = selectedMonth === 'all'
    ? invoices
    : invoices.filter((inv) => (inv.invoiceDate || '').startsWith(selectedMonth));

  const monthLabel = selectedMonth === 'all' ? 'All_Periods' : selectedMonth;
  const fileName = `GSTR1_Sales_Report_${monthLabel}.csv`;

  const rows = [];
  rows.push(['GSTR-1 SALES REGISTER', `Company: ${company.name || ''}`, `GSTIN: ${company.gstin || ''}`, `Period: ${selectedMonth}`]);
  rows.push([]);
  rows.push([
    'Invoice Number',
    'Invoice Date',
    'Customer Name',
    'Customer Phone',
    'Customer Address',
    'Item Description',
    'Quantity',
    'Unit Price (INR)',
    'Taxable Value (INR)',
    'GST Rate (%)',
    'CGST (INR)',
    'SGST (INR)',
    'Total Amount (INR)',
  ]);

  filteredInvoices.forEach((inv) => {
    const invItems = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [{ description: 'General Sale', quantity: 1, rate: inv.totals?.subtotal || 0, gstPercent: 18 }];
    invItems.forEach((item) => {
      const q = Number(item.quantity ?? 1);
      const r = Number(item.rate ?? 0);
      const g = Number(item.gstPercent ?? 0);
      const taxable = q * r;
      const tax = (taxable * g) / 100;
      const cgst = tax / 2;
      const sgst = tax / 2;
      const total = taxable + tax;

      rows.push([
        `"${inv.invoiceNumber || ''}"`,
        `"${inv.invoiceDate || ''}"`,
        `"${(inv.customerName || '').replace(/"/g, '""')}"`,
        `"${inv.customerPhone || ''}"`,
        `"${(inv.customerAddress || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        q,
        r.toFixed(2),
        taxable.toFixed(2),
        `${g}%`,
        cgst.toFixed(2),
        sgst.toFixed(2),
        total.toFixed(2),
      ]);
    });
  });

  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * 3. Export GSTR-1 Returns JSON Schema
 */
export function exportToGSTR1JSON(invoices = [], company = {}, selectedMonth = 'all') {
  const filteredInvoices = selectedMonth === 'all'
    ? invoices
    : invoices.filter((inv) => (inv.invoiceDate || '').startsWith(selectedMonth));

  const monthLabel = selectedMonth === 'all' ? new Date().toISOString().slice(0, 7) : selectedMonth;
  const periodFormatted = monthLabel.replace('-', ''); // e.g. 202608

  const gstr1Payload = {
    gstin: company.gstin || '00AAAAA0000A0Z0',
    fp: periodFormatted,
    cur_gt: 0,
    b2b: [],
    b2cs: [],
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          num_tot: filteredInvoices.length,
          from: filteredInvoices[filteredInvoices.length - 1]?.invoiceNumber || 'INV-0001',
          to: filteredInvoices[0]?.invoiceNumber || 'INV-0001',
        },
      ],
    },
  };

  filteredInvoices.forEach((inv) => {
    const invItems = (inv.items || []).map((item, idx) => {
      const q = Number(item.quantity ?? 1);
      const r = Number(item.rate ?? 0);
      const g = Number(item.gstPercent ?? 18);
      const txval = q * r;
      const iamt = (txval * g) / 100;
      const camt = iamt / 2;
      const samt = iamt / 2;

      return {
        num: idx + 1,
        itm_det: {
          txval: Number(txval.toFixed(2)),
          rt: g,
          camt: Number(camt.toFixed(2)),
          samt: Number(samt.toFixed(2)),
          csamt: 0,
        },
      };
    });

    // If customer has a GSTIN, map to b2b, otherwise b2cs
    if (inv.customerGstin && inv.customerGstin.trim().length === 15) {
      gstr1Payload.b2b.push({
        ctin: inv.customerGstin.trim().toUpperCase(),
        inv: [
          {
            inum: inv.invoiceNumber,
            idt: (inv.invoiceDate || '').split('-').reverse().join('-'), // DD-MM-YYYY
            val: inv.totals?.total || 0,
            pos: (company.state || '09').slice(-2),
            rchrg: 'N',
            inv_typ: 'R',
            itms: invItems,
          },
        ],
      });
    } else {
      (inv.items || []).forEach((item) => {
        const q = Number(item.quantity ?? 1);
        const r = Number(item.rate ?? 0);
        const g = Number(item.gstPercent ?? 18);
        const txval = q * r;
        const camt = (txval * g) / 200;
        const samt = camt;

        gstr1Payload.b2cs.push({
          sply_ty: 'INTRA',
          pos: (company.state || '09').slice(-2),
          typ: 'OE',
          rt: g,
          txval: Number(txval.toFixed(2)),
          camt: Number(camt.toFixed(2)),
          samt: Number(samt.toFixed(2)),
          csamt: 0,
        });
      });
    }
  });

  const jsonStr = JSON.stringify(gstr1Payload, null, 2);
  downloadFile(jsonStr, `GSTR1_${company.name ? company.name.replace(/\s+/g, '_') : 'Returns'}_${monthLabel}.json`, 'application/json');
}
