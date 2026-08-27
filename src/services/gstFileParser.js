// Universal GST File Parser & Importer Service
import * as XLSX from 'xlsx';
import { validateGSTIN, GST_STATE_CODES } from './gstinValidator.js';

export function normalizeGstDate(rawDate) {
  if (!rawDate) return new Date().toISOString().slice(0, 10);
  const s = String(rawDate).trim();
  
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const num = Number(s);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + num * 86400000);
    return dateObj.toISOString().slice(0, 10);
  }

  return s;
}

export function detectGstFileType(fileName = '', contentObj = null, workbook = null) {
  const lowerName = fileName.toLowerCase();

  if (contentObj && typeof contentObj === 'object') {
    if (contentObj.gstin && (contentObj.b2b || contentObj.b2cl || contentObj.b2cs || contentObj.hsn || contentObj.doc_issue)) {
      return { type: 'GSTR1_JSON', label: 'GSTR-1 Sales Return (JSON)', category: 'sales', icon: '📤' };
    }
    if (contentObj.docdata && (contentObj.docdata.b2b || contentObj.docdata.b2ba || contentObj.docdata.cdnr)) {
      return { type: 'GSTR2B_JSON', label: 'GSTR-2B Auto-Drafted ITC Statement (JSON)', category: 'purchase', icon: '📥' };
    }
    if (contentObj.b2b && Array.isArray(contentObj.b2b) && contentObj.b2b[0]?.inv) {
      return { type: 'GSTR2A_JSON', label: 'GSTR-2A Inward Supplies (JSON)', category: 'purchase', icon: '📥' };
    }
    if (contentObj.sup_details || contentObj.itc_elg || contentObj.inward_sup) {
      return { type: 'GSTR3B_JSON', label: 'GSTR-3B Return Summary (JSON)', category: 'summary', icon: '📊' };
    }
    if (contentObj.Irn || contentObj.irn || (contentObj.ValDtls && contentObj.BuyerDtls)) {
      return { type: 'EINVOICE_JSON', label: 'e-Invoice IRN Standard Schema (JSON)', category: 'sales', icon: '⚡' };
    }
    if (contentObj.ewbNo || contentObj.ewbDate || contentObj.GenGstin) {
      return { type: 'EWAYBILL_JSON', label: 'e-Way Bill Schema (JSON)', category: 'logistics', icon: '🚚' };
    }
    if (Array.isArray(contentObj) && contentObj.length > 0 && (contentObj[0].gstin || contentObj[0].GSTIN)) {
      return { type: 'TAXPAYER_MASTER_JSON', label: 'Taxpayer Master / GSTIN Directory (JSON)', category: 'parties', icon: '👥' };
    }
  }

  if (workbook && workbook.SheetNames) {
    const sheetNamesLower = workbook.SheetNames.map((s) => s.toLowerCase());
    const hasB2B = sheetNamesLower.some((s) => s.includes('b2b'));
    const hasB2CS = sheetNamesLower.some((s) => s.includes('b2cs'));
    const hasHSN = sheetNamesLower.some((s) => s.includes('hsn'));
    const hasGstr2B = sheetNamesLower.some((s) => s.includes('gstr-2b') || s.includes('gstr2b') || s.includes('itc'));

    if (hasGstr2B || lowerName.includes('gstr2b') || lowerName.includes('gstr-2b') || lowerName.includes('2b')) {
      return { type: 'GSTR2B_EXCEL', label: 'GSTR-2B ITC Statement (Excel)', category: 'purchase', icon: '📥' };
    }
    if (hasB2B && (hasB2CS || hasHSN || lowerName.includes('gstr1') || lowerName.includes('gstr-1'))) {
      return { type: 'GSTR1_EXCEL', label: 'GSTR-1 Portal Offline Tool (Excel)', category: 'sales', icon: '📤' };
    }
    if (sheetNamesLower.some((s) => s.includes('3b') || s.includes('gstr-3b'))) {
      return { type: 'GSTR3B_EXCEL', label: 'GSTR-3B Return (Excel)', category: 'summary', icon: '📊' };
    }
    return { type: 'GENERIC_GST_EXCEL', label: 'GST Spreadsheet (.XLSX/.CSV)', category: 'general', icon: '📊' };
  }

  if (lowerName.includes('gstr1') || lowerName.includes('gstr-1')) {
    return { type: 'GSTR1_GENERIC', label: 'GSTR-1 File', category: 'sales', icon: '📤' };
  }
  if (lowerName.includes('gstr2b') || lowerName.includes('gstr-2b') || lowerName.includes('2b')) {
    return { type: 'GSTR2B_GENERIC', label: 'GSTR-2B Statement', category: 'purchase', icon: '📥' };
  }
  if (lowerName.includes('einvoice') || lowerName.includes('e-invoice') || lowerName.includes('irn')) {
    return { type: 'EINVOICE_GENERIC', label: 'e-Invoice File', category: 'sales', icon: '⚡' };
  }

  return { type: 'UNKNOWN_GST', label: 'GST Document / Spreadsheet', category: 'general', icon: '📄' };
}

export function parseGstJsonFile(jsonString) {
  let data;
  try {
    data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (err) {
    throw new Error('Invalid JSON format: ' + err.message, { cause: err });
  }

  const fileType = detectGstFileType('', data);
  const result = {
    fileType,
    gstin: data.gstin || data.Gstin || data.SellerDtls?.Gstin || data.docdata?.gstin || '',
    returnPeriod: data.fp || data.docdata?.fp || data.ret_period || '',
    grossTaxable: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalCess: 0,
    totalInvoiceValue: 0,
    invoices: [],
    creditDebitNotes: [],
    hsnSummary: [],
    itcSummary: null,
    raw: data,
  };

  if (fileType.type === 'GSTR1_JSON' || data.b2b) {
    if (Array.isArray(data.b2b)) {
      data.b2b.forEach((party) => {
        const buyerGstin = party.ctin || '';
        const partyName = party.cname || party.trdnm || (buyerGstin ? `Party (${buyerGstin.slice(0, 10)})` : 'B2B Buyer');

        if (Array.isArray(party.inv)) {
          party.inv.forEach((inv) => {
            let invTaxable = 0;
            let invIgst = 0;
            let invCgst = 0;
            let invSgst = 0;
            const items = [];

            if (Array.isArray(inv.itms)) {
              inv.itms.forEach((itm, idx) => {
                const det = itm.itm_det || itm;
                const txval = Number(det.txval || 0);
                const rt = Number(det.rt || 18);
                const iamt = Number(det.iamt || 0);
                const camt = Number(det.camt || 0);
                const samt = Number(det.samt || 0);

                invTaxable += txval;
                invIgst += iamt;
                invCgst += camt;
                invSgst += samt;

                items.push({
                  id: String(idx + 1),
                  name: `Item ${idx + 1} (${rt}% GST)`,
                  hsn: itm.hsn || '',
                  quantity: 1,
                  price: txval,
                  gst: rt,
                  igst: iamt > 0,
                  amount: txval + iamt + camt + samt,
                });
              });
            }

            const invTotal = Number(inv.val || (invTaxable + invIgst + invCgst + invSgst));
            result.grossTaxable += invTaxable;
            result.totalIgst += invIgst;
            result.totalCgst += invCgst;
            result.totalSgst += invSgst;
            result.totalInvoiceValue += invTotal;

            result.invoices.push({
              id: `gstr1-${inv.inum}-${Date.now()}`,
              invoiceNumber: String(inv.inum || ''),
              invoiceDate: normalizeGstDate(inv.idt),
              customerName: partyName,
              customerGstin: buyerGstin,
              customerAddress: party.pos ? `POS: ${party.pos} - ${GST_STATE_CODES[party.pos] || ''}` : '',
              invoiceType: inv.inv_typ === 'R' ? 'Tax Invoice (B2B)' : (inv.inv_typ || 'Tax Invoice (B2B)'),
              pos: inv.pos || party.pos || '',
              reverseCharge: inv.rchrg === 'Y',
              items,
              totals: {
                subtotal: invTaxable,
                cgst: invCgst,
                sgst: invSgst,
                igst: invIgst,
                totalGst: invCgst + invSgst + invIgst,
                total: invTotal,
              },
              sourceSection: 'B2B (GSTR-1)',
            });
          });
        }
      });
    }

    if (Array.isArray(data.b2cl)) {
      data.b2cl.forEach((posGroup) => {
        const pos = posGroup.pos || '';
        if (Array.isArray(posGroup.inv)) {
          posGroup.inv.forEach((inv) => {
            let invTaxable = 0;
            let invIgst = 0;
            if (Array.isArray(inv.itms)) {
              inv.itms.forEach((itm) => {
                const det = itm.itm_det || itm;
                invTaxable += Number(det.txval || 0);
                invIgst += Number(det.iamt || 0);
              });
            }
            const invTotal = Number(inv.val || (invTaxable + invIgst));
            result.grossTaxable += invTaxable;
            result.totalIgst += invIgst;
            result.totalInvoiceValue += invTotal;

            result.invoices.push({
              id: `b2cl-${inv.inum}`,
              invoiceNumber: String(inv.inum || ''),
              invoiceDate: normalizeGstDate(inv.idt),
              customerName: `Inter-State Consumer (${GST_STATE_CODES[pos] || pos})`,
              customerGstin: 'URP',
              invoiceType: 'B2C Large (> ₹2.5 Lakhs)',
              pos,
              totals: { subtotal: invTaxable, totalGst: invIgst, igst: invIgst, total: invTotal },
              sourceSection: 'B2CL',
            });
          });
        }
      });
    }

    if (data.hsn && Array.isArray(data.hsn.data)) {
      result.hsnSummary = data.hsn.data.map((h) => ({
        hsn: h.hsn_sc || h.hsn,
        description: h.desc || '',
        uqc: h.uqc || 'NOS',
        totalQuantity: Number(h.qty || 0),
        taxableValue: Number(h.txval || 0),
        igst: Number(h.iamt || 0),
        cgst: Number(h.camt || 0),
        sgst: Number(h.samt || 0),
        totalValue: Number(h.val || 0),
      }));
    }
  }

  if (fileType.type === 'GSTR2B_JSON' || data.docdata?.b2b) {
    const b2bList = data.docdata?.b2b || data.b2b || [];
    b2bList.forEach((supplier) => {
      const supplierGstin = supplier.ctin || '';
      const supplierName = supplier.cname || supplier.trdnm || (supplierGstin ? `Supplier (${supplierGstin.slice(0, 10)})` : 'Registered Supplier');

      if (Array.isArray(supplier.inv)) {
        supplier.inv.forEach((inv) => {
          let invTaxable = 0;
          let invIgst = 0;
          let invCgst = 0;
          let invSgst = 0;
          const items = [];

          if (Array.isArray(inv.itms)) {
            inv.itms.forEach((itm, idx) => {
              const det = itm.itm_det || itm;
              const txval = Number(det.txval || 0);
              const rt = Number(det.rt || 18);
              const iamt = Number(det.iamt || 0);
              const camt = Number(det.camt || 0);
              const samt = Number(det.samt || 0);

              invTaxable += txval;
              invIgst += iamt;
              invCgst += camt;
              invSgst += samt;

              items.push({
                name: `Inward Item ${idx + 1} (${rt}%)`,
                rate: txval,
                quantity: 1,
                gstRate: rt,
                total: txval + iamt + camt + samt,
              });
            });
          }

          const totalBill = Number(inv.val || (invTaxable + invIgst + invCgst + invSgst));
          result.grossTaxable += invTaxable;
          result.totalIgst += invIgst;
          result.totalCgst += invCgst;
          result.totalSgst += invSgst;
          result.totalInvoiceValue += totalBill;

          result.invoices.push({
            id: `gstr2b-${inv.inum}-${Date.now()}`,
            billNumber: String(inv.inum || ''),
            invoiceNumber: String(inv.inum || ''),
            billDate: normalizeGstDate(inv.idt),
            invoiceDate: normalizeGstDate(inv.idt),
            vendorName: supplierName,
            customerName: supplierName,
            vendorGstin: supplierGstin,
            customerGstin: supplierGstin,
            itcAvailable: inv.itcavl !== 'N',
            itcReason: inv.rsn || (inv.itcavl === 'N' ? 'Ineligible ITC' : 'Eligible ITC'),
            filingDate: inv.srctyp ? `${inv.srctyp} (${inv.irngendate || 'Filed'})` : 'Auto-Drafted',
            totals: {
              taxableAmount: invTaxable,
              subtotal: invTaxable,
              cgst: invCgst,
              sgst: invSgst,
              igst: invIgst,
              totalGst: invCgst + invSgst + invIgst,
              total: totalBill,
            },
            items,
            sourceSection: 'GSTR-2B (ITC Statement)',
          });
        });
      }
    });
  }

  if (fileType.type === 'EINVOICE_JSON' || data.Irn || data.BuyerDtls) {
    const buyer = data.BuyerDtls || {};
    const val = data.ValDtls || {};
    const items = (data.ItemList || []).map((itm, idx) => ({
      id: String(idx + 1),
      name: itm.PrdDesc || itm.ItemDesc || `Item ${idx + 1}`,
      hsn: itm.HsnCd || '',
      quantity: Number(itm.Qty || 1),
      price: Number(itm.UnitPrice || itm.TotAmt || 0),
      gst: Number(itm.GstRt || 18),
      amount: Number(itm.TotItemVal || 0),
    }));

    const invTotal = Number(val.TotInvVal || 0);
    result.grossTaxable = Number(val.AssVal || 0);
    result.totalCgst = Number(val.CgstVal || 0);
    result.totalSgst = Number(val.SgstVal || 0);
    result.totalIgst = Number(val.IgstVal || 0);
    result.totalInvoiceValue = invTotal;

    result.invoices.push({
      id: `einv-${data.DocDtls?.No || Date.now()}`,
      invoiceNumber: data.DocDtls?.No || 'EINV-001',
      invoiceDate: normalizeGstDate(data.DocDtls?.Dt),
      customerName: buyer.LglNm || buyer.TrdNm || 'B2B Buyer',
      customerGstin: buyer.Gstin || '',
      customerAddress: `${buyer.Addr1 || ''}, ${buyer.Loc || ''}, ${buyer.Pin || ''}`,
      irn: data.Irn || '',
      ackNo: data.AckNo || '',
      ackDt: data.AckDt || '',
      signedQrCode: data.SignedQRCode || '',
      items,
      totals: {
        subtotal: result.grossTaxable,
        cgst: result.totalCgst,
        sgst: result.totalSgst,
        igst: result.totalIgst,
        totalGst: result.totalCgst + result.totalSgst + result.totalIgst,
        total: invTotal,
      },
      sourceSection: 'e-Invoice (IRP Portal)',
    });
  }

  return result;
}

export function parseGstExcelWorkbook(workbook, fileName = '') {
  const fileType = detectGstFileType(fileName, null, workbook);
  const result = {
    fileType,
    fileName,
    grossTaxable: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalInvoiceValue: 0,
    invoices: [],
    parties: [],
    hsnSummary: [],
  };

  workbook.SheetNames.forEach((sheetName) => {
    const lower = sheetName.toLowerCase().trim();
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) return;

    if (lower.includes('b2b') || lower.includes('invoice') || lower.includes('sales') || lower.includes('purchase')) {
      rows.forEach((r, idx) => {
        const gstin = r['GSTIN/UIN of Recipient'] || r['GSTIN of Supplier'] || r['GSTIN'] || r['ctin'] || r['Party GSTIN'] || '';
        const partyName = r['Receiver Name'] || r['Trade/Legal Name'] || r['Supplier Name'] || r['Party Name'] || r['Customer Name'] || (gstin ? `Party (${gstin.slice(0, 10)})` : `Party ${idx + 1}`);
        const invNum = String(r['Invoice Number'] || r['Invoice No'] || r['Bill No'] || r['Doc No'] || r['inum'] || `INV-${idx + 1}`).trim();
        const invDate = normalizeGstDate(r['Invoice date'] || r['Invoice Date'] || r['Date'] || r['idt']);
        const invVal = Number(r['Invoice Value'] || r['Total Amount'] || r['Bill Value'] || r['val'] || 0);
        const txval = Number(r['Taxable Value'] || r['Taxable Amount'] || r['txval'] || 0);
        const rate = Number(r['Rate'] || r['GST Rate'] || r['rt'] || 18);
        const igst = Number(r['Integrated Tax'] || r['IGST'] || r['iamt'] || 0);
        const cgst = Number(r['Central Tax'] || r['CGST'] || r['camt'] || 0);
        const sgst = Number(r['State/UT Tax'] || r['SGST'] || r['samt'] || 0);
        const pos = String(r['Place Of Supply'] || r['POS'] || r['pos'] || '');

        const totalGst = (igst + cgst + sgst) || (txval * rate / 100);
        const total = invVal || (txval + totalGst);

        result.grossTaxable += txval;
        result.totalIgst += igst;
        result.totalCgst += cgst;
        result.totalSgst += sgst;
        result.totalInvoiceValue += total;

        result.invoices.push({
          id: `excel-${invNum}-${idx}`,
          invoiceNumber: invNum,
          billNumber: invNum,
          invoiceDate: invDate,
          billDate: invDate,
          customerName: partyName,
          vendorName: partyName,
          customerGstin: gstin,
          vendorGstin: gstin,
          pos,
          items: [
            {
              id: '1',
              name: `Goods / Services (${rate}% GST)`,
              quantity: 1,
              price: txval,
              gst: rate,
              igst: igst > 0,
              amount: total,
            },
          ],
          totals: {
            subtotal: txval,
            taxableAmount: txval,
            cgst,
            sgst,
            igst,
            totalGst,
            total,
          },
          sourceSection: sheetName,
        });

        if (gstin && !result.parties.some((p) => p.gstin === gstin)) {
          result.parties.push({
            name: partyName,
            gstin,
            type: fileType.category === 'purchase' ? 'Vendor' : 'Customer',
          });
        }
      });
    }

    if (lower.includes('hsn')) {
      rows.forEach((r) => {
        const hsn = String(r['HSN'] || r['HSN/SAC'] || r['hsn_sc'] || '').trim();
        if (!hsn) return;
        result.hsnSummary.push({
          hsn,
          description: r['Description'] || r['desc'] || '',
          uqc: r['UQC'] || r['uqc'] || 'NOS',
          totalQuantity: Number(r['Total Quantity'] || r['qty'] || 0),
          taxableValue: Number(r['Total Taxable Value'] || r['txval'] || 0),
          igst: Number(r['Integrated Tax Amount'] || r['iamt'] || 0),
          cgst: Number(r['Central Tax Amount'] || r['camt'] || 0),
          sgst: Number(r['State/UT Tax Amount'] || r['samt'] || 0),
          totalValue: Number(r['Total Value'] || r['val'] || 0),
        });
      });
    }
  });

  return result;
}

export function reconcile2bWithPurchaseBills(gstr2bInvoices = [], purchaseBills = []) {
  const matched = [];
  const portalOnly = [];
  const booksOnly = [];
  const amountMismatch = [];

  const matchedBookIds = new Set();

  gstr2bInvoices.forEach((portalInv) => {
    const pNum = String(portalInv.billNumber || portalInv.invoiceNumber || '').trim().toLowerCase();
    const pGstin = String(portalInv.vendorGstin || portalInv.customerGstin || '').trim().toUpperCase();
    const pTotal = Number(portalInv.totals?.total || 0);

    const foundBook = purchaseBills.find((b) => {
      const bNum = String(b.billNumber || '').trim().toLowerCase();
      const bGstin = String(b.vendorGstin || '').trim().toUpperCase();
      return bNum === pNum || (bGstin && bGstin === pGstin && Math.abs(Number(b.totals?.total || 0) - pTotal) < 5);
    });

    if (foundBook) {
      matchedBookIds.add(foundBook.id);
      const bTotal = Number(foundBook.totals?.total || 0);
      const diff = Math.abs(pTotal - bTotal);
      if (diff > 1) {
        amountMismatch.push({
          portalInvoice: portalInv,
          bookBill: foundBook,
          diff: Number(diff.toFixed(2)),
          status: 'Amount Discrepancy',
        });
      } else {
        matched.push({
          portalInvoice: portalInv,
          bookBill: foundBook,
          status: 'Exact Match',
        });
      }
    } else {
      portalOnly.push({
        portalInvoice: portalInv,
        status: 'Available in GSTR-2B (Missing in Books)',
      });
    }
  });

  purchaseBills.forEach((b) => {
    if (!matchedBookIds.has(b.id)) {
      booksOnly.push({
        bookBill: b,
        status: 'In Purchase Books (Not in GSTR-2B)',
      });
    }
  });

  return {
    matched,
    portalOnly,
    booksOnly,
    amountMismatch,
    totalPortalBills: gstr2bInvoices.length,
    totalBookBills: purchaseBills.length,
    claimableItcMatched: matched.reduce((acc, m) => acc + Number(m.portalInvoice.totals?.totalGst || 0), 0),
    unclaimedPortalItc: portalOnly.reduce((acc, p) => acc + Number(p.portalInvoice.totals?.totalGst || 0), 0),
    atRiskBooksItc: booksOnly.reduce((acc, b) => acc + Number(b.bookBill.totals?.totalGst || 0), 0),
  };
}

export function generateGstr1UploadJson(invoices = [], company = {}, returnPeriod = '') {
  const gstin = (company.gstin || '').trim().toUpperCase();
  const fp = returnPeriod || new Date().toISOString().slice(5, 7) + new Date().getFullYear();

  const b2bMap = {};
  const hsnMap = {};

  invoices.forEach((inv) => {
    const buyerGstin = (inv.customerGstin || '').trim().toUpperCase();
    const isB2B = buyerGstin && buyerGstin !== 'URP' && validateGSTIN(buyerGstin).isValid;
    const invDate = inv.invoiceDate ? inv.invoiceDate.split('-').reverse().join('-') : new Date().toISOString().slice(0, 10).split('-').reverse().join('-');

    const itms = (inv.items || []).map((itm, idx) => {
      const txval = Number(itm.price || 0) * Number(itm.quantity || 1);
      const rt = Number(itm.gst || 18);
      const isIgst = Boolean(itm.igst);
      const iamt = isIgst ? (txval * rt) / 100 : 0;
      const camt = !isIgst ? (txval * (rt / 2)) / 100 : 0;
      const samt = !isIgst ? (txval * (rt / 2)) / 100 : 0;

      const hsnCode = itm.hsn || '9983';
      if (!hsnMap[hsnCode]) {
        hsnMap[hsnCode] = { hsn_sc: hsnCode, desc: itm.name || 'Goods/Services', uqc: itm.unit || 'NOS', qty: 0, val: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
      }
      hsnMap[hsnCode].qty += Number(itm.quantity || 1);
      hsnMap[hsnCode].txval += txval;
      hsnMap[hsnCode].iamt += iamt;
      hsnMap[hsnCode].camt += camt;
      hsnMap[hsnCode].samt += samt;
      hsnMap[hsnCode].val += txval + iamt + camt + samt;

      return {
        num: idx + 1,
        itm_det: {
          txval: Number(txval.toFixed(2)),
          rt,
          iamt: Number(iamt.toFixed(2)),
          camt: Number(camt.toFixed(2)),
          samt: Number(samt.toFixed(2)),
          csamt: 0,
        },
      };
    });

    if (isB2B) {
      if (!b2bMap[buyerGstin]) {
        b2bMap[buyerGstin] = {
          ctin: buyerGstin,
          inv: [],
        };
      }
      b2bMap[buyerGstin].inv.push({
        inum: inv.invoiceNumber || 'INV-001',
        idt: invDate,
        val: Number((inv.totals?.total || 0).toFixed(2)),
        pos: buyerGstin.slice(0, 2),
        rchrg: 'N',
        inv_typ: 'R',
        itms,
      });
    }
  });

  return {
    gstin,
    fp,
    gt: 0,
    cur_gt: 0,
    b2b: Object.values(b2bMap),
    b2cl: [],
    b2cs: [],
    cdnr: [],
    hsn: {
      data: Object.values(hsnMap),
    },
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          num: invoices.length,
          from: invoices[invoices.length - 1]?.invoiceNumber || '1',
          to: invoices[0]?.invoiceNumber || String(invoices.length),
          totnum: invoices.length,
          canc: 0,
          net_issue: invoices.length,
        },
      ],
    },
  };
}