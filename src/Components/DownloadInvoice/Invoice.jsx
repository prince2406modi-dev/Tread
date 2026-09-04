import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper function to convert numeric amount into Indian English Words
export function amountToIndianWords(amount) {
  if (!amount || isNaN(amount) || Number(amount) === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function numToWordsUnderThousand(n) {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const [rupeesPart, paisePart] = Number(amount).toFixed(2).split('.');
  let num = parseInt(rupeesPart, 10);
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  if (crore > 0) words += numToWordsUnderThousand(crore) + ' Crore ';
  if (lakh > 0) words += numToWordsUnderThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += numToWordsUnderThousand(thousand) + ' Thousand ';
  if (remainder > 0) words += numToWordsUnderThousand(remainder) + ' ';

  words = words.trim();
  if (!words) words = 'Zero';

  let result = 'INR ' + words;

  const paise = parseInt(paisePart, 10);
  if (paise > 0) {
    result += ' and ' + numToWordsUnderThousand(paise) + ' Paise';
  }

  return result + ' Only';
}

function downloadPDF(invoice, company = null, copyType = 'Original for Recipient') {
  if (!invoice) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2; // 194 mm

  // Company Details & Defaults (Clean, user-configured only)
  const compName = (company?.name || '').trim();
  const compAddress = (company?.address || '').trim();
  const compGstin = (company?.gstin || '').trim();
  const compPan = (company?.pan || (compGstin.length >= 12 ? compGstin.slice(2, 12) : '')).trim();
  const compFssai = (company?.fssai || '').trim();
  const compPhone = (company?.phone || '').trim();
  const compEmail = (company?.email || '').trim();
  const compState = (company?.state || '').trim();

  const bankName = (company?.bankName || '').trim();
  const accountNo = (company?.accountNumber || '').trim();
  const ifscCode = (company?.ifsc || '').trim();
  const branchName = (company?.branch || '').trim();

  // Invoice Mode (Local CGST+SGST vs Central IGST)
  const isInterState = invoice.invoiceType === 'central' || invoice.isInterState || false;

  // 1. Full Page Outer Box Border
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.rect(margin, margin, contentWidth, 281);

  // 2. Top Right Copy Header Tag
  doc.setFillColor(241, 245, 249);
  doc.rect(pageWidth - margin - 52, margin + 2.5, 50, 6.5, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.rect(pageWidth - margin - 52, margin + 2.5, 50, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text((copyType || 'ORIGINAL FOR RECIPIENT').toUpperCase(), pageWidth - margin - 27, margin + 6.8, { align: 'center' });

  // 3. Company Brand Logo / Monogram Box (Left)
  const logoX = margin + 2.5;
  const logoY = margin + 3.5;
  const logoWidth = 26;
  const logoHeight = 17;

  let logoRendered = false;
  if (company?.logo && typeof company.logo === 'string' && company.logo.startsWith('data:image')) {
    try {
      const format = company.logo.includes('png') ? 'PNG' : company.logo.includes('webp') ? 'WEBP' : 'JPEG';
      doc.addImage(company.logo, format, logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
      logoRendered = true;
    } catch (err) {
      console.warn('Custom logo render notice in PDF:', err);
      logoRendered = false;
    }
  }

  if (!logoRendered) {
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.4);
    doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 1.5, 1.5, 'S');

    // Compute monogram initials from company name if set
    const wordsList = compName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    const initials = wordsList.length >= 2
      ? (wordsList[0][0] + wordsList[1][0]).toUpperCase()
      : (compName ? compName.slice(0, 2).toUpperCase() : 'GST');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(67, 56, 202);
    doc.text(initials, logoX + 13, logoY + 10.5, { align: 'center' });

    doc.setFontSize(5.8);
    doc.setTextColor(185, 28, 28);
    doc.text(compGstin ? 'GST REGISTERED' : 'TAX INVOICE', logoX + 13, logoY + 15, { align: 'center' });
  }

  // 4. Header Center Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', margin + contentWidth / 2, margin + 6.5, { align: 'center' });

  doc.setFontSize(13.5);
  doc.setTextColor(30, 58, 138);
  doc.text(compName ? compName.toUpperCase() : 'TAX INVOICE', margin + contentWidth / 2, margin + 12, { align: 'center' });

  if (compAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(compAddress, margin + contentWidth / 2, margin + 16, { align: 'center', maxWidth: 125 });
  }

  const taxDetailsLine = [
    compGstin ? `GSTIN: ${compGstin}` : '',
    compPan ? `PAN: ${compPan}` : '',
    compState ? `State: ${compState}` : '',
  ].filter(Boolean).join('  |  ');

  if (taxDetailsLine) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(taxDetailsLine, margin + contentWidth / 2, margin + 20, { align: 'center' });
  }

  const contactLine = [
    compFssai ? `FSSAI Lic. No.: ${compFssai}` : '',
    compPhone ? `Phone: ${compPhone}` : '',
    compEmail ? `Email: ${compEmail}` : '',
  ].filter(Boolean).join('  |  ');

  if (contactLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(contactLine, margin + contentWidth / 2, margin + 23.8, { align: 'center' });
  }

  const headerBottomY = margin + 26.5;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.line(margin, headerBottomY, margin + contentWidth, headerBottomY);

  // 5. Metadata Row (Invoice No, Date, Place of Supply, Reverse Charge)
  const metaY = headerBottomY;
  const metaHeight = 11;
  const midX = margin + contentWidth / 2;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(midX, metaY, midX, metaY + metaHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  // Left Meta: Invoice No & Date
  doc.text('Invoice No.', margin + 3, metaY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${invoice.invoiceNumber || '1092/2026-27'}`, margin + 26, metaY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Invoice Date', margin + 3, metaY + 8.5);
  const formattedDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-')
    : new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${formattedDate}`, margin + 26, metaY + 8.5);

  // Right Meta: Place of Supply & Mode
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Place of Supply', midX + 3, metaY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${invoice.placeOfSupply || compState}`, midX + 30, metaY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Reverse Charge', midX + 3, metaY + 8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${invoice.reverseCharge || 'No (N)'}`, midX + 30, metaY + 8.5);

  const metaBottomY = metaY + metaHeight;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.line(margin, metaBottomY, margin + contentWidth, metaBottomY);

  // 6. Party Information Box (Billed to / Shipped to)
  const partyY = metaBottomY;
  const partyHeight = 31;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(midX, partyY, midX, partyY + partyHeight);

  // Left (Billed To)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DETAILS OF RECEIVER | BILLED TO :', margin + 3, partyY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text((invoice.customerName || 'GULATI CATERERS').toUpperCase(), margin + 3, partyY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(invoice.customerAddress || 'GT-60, Sector - 70, Noida', margin + 3, partyY + 13, { maxWidth: 88 });

  doc.text('Party Mobile', margin + 3, partyY + 22.5);
  doc.text(`:  ${invoice.customerPhone || '7217706305'}`, margin + 24, partyY + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('GSTIN / UIN', margin + 3, partyY + 26.5);
  doc.text(`:  ${invoice.customerGstin || 'Unregistered'}`, margin + 24, partyY + 26.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('State & Code', margin + 3, partyY + 30);
  doc.text(`:  ${invoice.customerState || compState}`, margin + 24, partyY + 30);

  // Right (Shipped To)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DETAILS OF CONSIGNEE | SHIPPED TO :', midX + 3, partyY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text((invoice.shipToName || invoice.customerName || 'GULATI CATERERS').toUpperCase(), midX + 3, partyY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(invoice.shipToAddress || invoice.customerAddress || 'GT-60, Sector - 70, Noida', midX + 3, partyY + 13, { maxWidth: 88 });

  doc.text('Contact No', midX + 3, partyY + 22.5);
  doc.text(`:  ${invoice.shipToPhone || invoice.customerPhone || '7217706305'}`, midX + 28, partyY + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('GSTIN / UIN', midX + 3, partyY + 26.5);
  doc.text(`:  ${invoice.shipToGstin || invoice.customerGstin || 'Unregistered'}`, midX + 28, partyY + 26.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('State & Code', midX + 3, partyY + 30);
  doc.text(`:  ${invoice.shipToState || invoice.customerState || compState}`, midX + 28, partyY + 30);

  const partyBottomY = partyY + partyHeight;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.line(margin, partyBottomY, margin + contentWidth, partyBottomY);

  // 7. Line Items Table
  const rawItems = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [
    { description: 'Salted Peanut MRP 10', hsn: '21069099', quantity: 80, unit: 'Laddi', rate: 101.00, gstPercent: 5 },
    { description: 'Chips Salted MRP 15', hsn: '20052000', quantity: 36, unit: 'Laddi', rate: 100.00, gstPercent: 5 },
  ];

  let totalQty = 0;
  let totalTaxableValue = 0;
  let totalCgstAmt = 0;
  let totalSgstAmt = 0;
  let totalIgstAmt = 0;
  let totalGrossAmount = 0;
  let primaryUnit = 'PCS';
  const taxSlabMap = {};

  const tableBody = rawItems.map((item, idx) => {
    const sn = `${idx + 1}`;
    const desc = item.description || item.name || 'Product Item';
    const hsn = item.hsn || item.hsnCode || 'â€”';
    const qty = Number(item.quantity ?? item.stock ?? 1) || 1;
    const unit = item.unit || 'PCS';
    primaryUnit = unit;
    totalQty += qty;

    const rate = Number(item.rate ?? item.price ?? 0) || 0;
    const gstPct = Number(item.gstPercent ?? item.gst ?? 0) || 0;

    const taxableAmount = qty * rate;
    totalTaxableValue += taxableAmount;

    const halfGstPct = gstPct / 2;
    const totalTax = (taxableAmount * gstPct) / 100;
    const cgstAmt = isInterState ? 0 : totalTax / 2;
    const sgstAmt = isInterState ? 0 : totalTax / 2;
    const igstAmt = isInterState ? totalTax : 0;
    const lineTotal = taxableAmount + totalTax;

    totalCgstAmt += cgstAmt;
    totalSgstAmt += sgstAmt;
    totalIgstAmt += igstAmt;
    totalGrossAmount += lineTotal;

    // Accumulate tax slabs
    const slabKey = `${gstPct}%`;
    if (!taxSlabMap[slabKey]) {
      taxSlabMap[slabKey] = {
        hsn: hsn !== 'â€”' ? hsn : '2106',
        rate: `${gstPct}%`,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0
      };
    }
    taxSlabMap[slabKey].taxable += taxableAmount;
    taxSlabMap[slabKey].cgst += cgstAmt;
    taxSlabMap[slabKey].sgst += sgstAmt;
    taxSlabMap[slabKey].igst += igstAmt;
    taxSlabMap[slabKey].totalTax += totalTax;

    if (isInterState) {
      return [
        sn,
        desc,
        hsn,
        qty.toString(),
        unit,
        rate.toFixed(2),
        taxableAmount.toFixed(2),
        `${gstPct.toFixed(2)}%`,
        igstAmt.toFixed(2),
        lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ];
    }

    return [
      sn,
      desc,
      hsn,
      qty.toString(),
      unit,
      rate.toFixed(2),
      taxableAmount.toFixed(2),
      `${halfGstPct.toFixed(2)}%`,
      cgstAmt.toFixed(2),
      `${halfGstPct.toFixed(2)}%`,
      sgstAmt.toFixed(2),
      lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
  });

  const tableHead = isInterState
    ? [
        [
          { content: '#', rowSpan: 2, styles: { cellWidth: 7, halign: 'center' } },
          { content: 'Description of Goods / Services', rowSpan: 2, styles: { cellWidth: 54, halign: 'left' } },
          { content: 'HSN/SAC', rowSpan: 2, styles: { cellWidth: 18, halign: 'center' } },
          { content: 'Qty', rowSpan: 2, styles: { cellWidth: 12, halign: 'right' } },
          { content: 'Unit', rowSpan: 2, styles: { cellWidth: 12, halign: 'center' } },
          { content: 'Rate (Rs.)', rowSpan: 2, styles: { cellWidth: 16, halign: 'right' } },
          { content: 'Taxable (Rs.)', rowSpan: 2, styles: { cellWidth: 22, halign: 'right' } },
          { content: 'IGST (Integrated Tax)', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total (Rs.)', rowSpan: 2, styles: { cellWidth: 25, halign: 'right' } }
        ],
        [
          { content: 'Rate', styles: { cellWidth: 12, halign: 'center' } },
          { content: 'Amount', styles: { cellWidth: 16, halign: 'right' } }
        ]
      ]
    : [
        [
          { content: '#', rowSpan: 2, styles: { cellWidth: 6, halign: 'center' } },
          { content: 'Description of Goods / Services', rowSpan: 2, styles: { cellWidth: 46, halign: 'left' } },
          { content: 'HSN/SAC', rowSpan: 2, styles: { cellWidth: 16, halign: 'center' } },
          { content: 'Qty', rowSpan: 2, styles: { cellWidth: 10, halign: 'right' } },
          { content: 'Unit', rowSpan: 2, styles: { cellWidth: 11, halign: 'center' } },
          { content: 'Rate', rowSpan: 2, styles: { cellWidth: 14, halign: 'right' } },
          { content: 'Taxable', rowSpan: 2, styles: { cellWidth: 17, halign: 'right' } },
          { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total (Rs.)', rowSpan: 2, styles: { cellWidth: 22, halign: 'right' } }
        ],
        [
          { content: 'Rate', styles: { cellWidth: 10, halign: 'center' } },
          { content: 'Amount', styles: { cellWidth: 14, halign: 'right' } },
          { content: 'Rate', styles: { cellWidth: 10, halign: 'center' } },
          { content: 'Amount', styles: { cellWidth: 14, halign: 'right' } }
        ]
      ];

  autoTable(doc, {
    startY: partyBottomY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
      lineColor: [100, 116, 139],
      lineWidth: 0.25
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    head: tableHead,
    body: tableBody,
    columnStyles: isInterState
      ? {
          0: { halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'center' },
          8: { halign: 'right' },
          9: { halign: 'right', fontStyle: 'bold' }
        }
      : {
          0: { halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'center' },
          8: { halign: 'right' },
          9: { halign: 'center' },
          10: { halign: 'right' },
          11: { halign: 'right', fontStyle: 'bold' }
        }
  });

  // Grand Total Summary Row
  const itemsTableFinalY = doc.lastAutoTable.finalY;
  const summaryBody = isInterState
    ? [
        [
          { content: 'Total :', styles: { halign: 'right', cellWidth: 79 } },
          { content: `${totalQty} ${primaryUnit}`, styles: { halign: 'center', cellWidth: 24 } },
          { content: `Rs. ${totalTaxableValue.toFixed(2)}`, styles: { halign: 'right', cellWidth: 22 } },
          { content: '', styles: { cellWidth: 12 } },
          { content: `Rs. ${totalIgstAmt.toFixed(2)}`, styles: { halign: 'right', cellWidth: 16 } },
          {
            content: `Rs. ${totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            styles: { halign: 'right', cellWidth: 25, fontStyle: 'bold', textColor: [30, 58, 138] }
          }
        ]
      ]
    : [
        [
          { content: 'Total :', styles: { halign: 'right', cellWidth: 68 } },
          { content: `${totalQty} ${primaryUnit}`, styles: { halign: 'center', cellWidth: 21 } },
          { content: '', styles: { cellWidth: 14 } },
          { content: `Rs. ${totalTaxableValue.toFixed(2)}`, styles: { halign: 'right', cellWidth: 17 } },
          { content: '', styles: { cellWidth: 10 } },
          { content: `Rs. ${totalCgstAmt.toFixed(2)}`, styles: { halign: 'right', cellWidth: 14 } },
          { content: '', styles: { cellWidth: 10 } },
          { content: `Rs. ${totalSgstAmt.toFixed(2)}`, styles: { halign: 'right', cellWidth: 14 } },
          {
            content: `Rs. ${totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            styles: { halign: 'right', cellWidth: 22, fontStyle: 'bold', textColor: [30, 58, 138] }
          }
        ]
      ];

  autoTable(doc, {
    startY: itemsTableFinalY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      fontSize: 7.5,
      fontStyle: 'bold',
      lineColor: [100, 116, 139],
      lineWidth: 0.25,
      cellPadding: 1.8,
      fillColor: [241, 245, 249]
    },
    body: summaryBody
  });

  // 8. GST Tax Slabs Breakdown Table
  const taxSummaryY = doc.lastAutoTable.finalY + 2.5;
  const taxRows = Object.values(taxSlabMap).map((s) => {
    if (isInterState) {
      return [
        s.hsn,
        s.rate,
        s.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        s.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        s.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ];
    }
    return [
      s.hsn,
      s.rate,
      s.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      s.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      s.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      s.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
  });

  // Add summary total row to tax table
  if (isInterState) {
    taxRows.push([
      'Total',
      'â€”',
      totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalIgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalIgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);
  } else {
    taxRows.push([
      'Total',
      'â€”',
      totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalCgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalSgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (totalCgstAmt + totalSgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);
  }

  const taxHead = isInterState
    ? [['HSN/SAC', 'Tax Rate', 'Taxable Amt (Rs.)', 'IGST Amt (Rs.)', 'Total Tax (Rs.)']]
    : [['HSN/SAC', 'Tax Rate', 'Taxable Amt (Rs.)', 'CGST Amt (Rs.)', 'SGST Amt (Rs.)', 'Total Tax (Rs.)']];

  autoTable(doc, {
    startY: taxSummaryY,
    margin: { left: margin, right: margin + 74 },
    theme: 'plain',
    tableWidth: 118,
    styles: {
      fontSize: 6.8,
      cellPadding: 1.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [248, 250, 252],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.5,
      lineColor: [100, 116, 139],
      lineWidth: 0.25,
      textColor: [15, 23, 42]
    },
    head: taxHead,
    body: taxRows,
    columnStyles: isInterState
      ? {
          0: { halign: 'center' },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' }
        }
      : {
          0: { halign: 'center' },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        }
  });

  // Right Side Totals Calculation Box
  const totalsBoxX = margin + 122;
  const totalsBoxWidth = 72;
  const totalsBoxY = taxSummaryY;

  doc.setFillColor(248, 250, 252);
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, 23.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, 23.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);

  doc.text('Taxable Amount', totalsBoxX + 2.5, totalsBoxY + 4.5);
  doc.text(`Rs. ${totalTaxableValue.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 2.5, totalsBoxY + 4.5, { align: 'right' });

  if (isInterState) {
    doc.text('Add: Total IGST', totalsBoxX + 2.5, totalsBoxY + 8.5);
    doc.text(`Rs. ${totalIgstAmt.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 2.5, totalsBoxY + 8.5, { align: 'right' });
  } else {
    doc.text('Add: Total CGST', totalsBoxX + 2.5, totalsBoxY + 8.5);
    doc.text(`Rs. ${totalCgstAmt.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 2.5, totalsBoxY + 8.5, { align: 'right' });

    doc.text('Add: Total SGST', totalsBoxX + 2.5, totalsBoxY + 12.5);
    doc.text(`Rs. ${totalSgstAmt.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 2.5, totalsBoxY + 12.5, { align: 'right' });
  }

  // Invoice Final Total Highlight Banner
  doc.setFillColor(224, 231, 255);
  doc.rect(totalsBoxX, totalsBoxY + 16, totalsBoxWidth, 7.5, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.3);
  doc.rect(totalsBoxX, totalsBoxY + 16, totalsBoxWidth, 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Invoice Total :', totalsBoxX + 2.5, totalsBoxY + 21);
  doc.text(
    `Rs. ${totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalsBoxX + totalsBoxWidth - 2.5,
    totalsBoxY + 21,
    { align: 'right' }
  );

  // 9. Amount in Words Banner & Banking Details
  let curY = Math.max(doc.lastAutoTable.finalY + 3.5, totalsBoxY + 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Invoice Amount in Words :', margin + 3, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const amountWords = amountToIndianWords(totalGrossAmount);
  doc.text(amountWords, margin + 42, curY, { maxWidth: 148 });

  curY += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 2, curY, contentWidth - 4, 11, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(margin + 2, curY, contentWidth - 4, 11, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('ðŸ¦ BANK & SETTLEMENT DETAILS', margin + 4, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Bank Name : ${bankName || 'N/A'}`, margin + 4, curY + 8.5);
  doc.text(`A/C No. : ${accountNo || 'N/A'}`, margin + 65, curY + 8.5);
  doc.text(`IFSC Code : ${ifscCode || 'N/A'}`, margin + 125, curY + 8.5);
  doc.text(`Branch : ${branchName || 'N/A'}`, margin + 165, curY + 8.5);

  // 10. Footer Section (Terms & Conditions | Authorised Signatory)
  const footerY = 248;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.line(margin, footerY, margin + contentWidth, footerY);
  doc.line(midX, footerY, midX, margin + 281);

  // Left Footer: Terms & Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TERMS & CONDITIONS', margin + 3, footerY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('1. Goods once sold will not be taken back or exchanged.', margin + 3, footerY + 9);
  doc.text('2. Interest @ 18% p.a. will be charged if payment is delayed beyond credit period.', margin + 3, footerY + 13.5);
  doc.text(`3. All disputes are subject to ${compState ? `'${compState}'` : 'local'} Jurisdiction only.`, margin + 3, footerY + 18);
  doc.text('4. Certified that the particulars given above are true and correct.', margin + 3, footerY + 22.5);

  // Right Footer: Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Receiver's Stamp & Signature :", midX + 3, footerY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${compName ? compName.toUpperCase() : 'AUTHORISED SIGNATORY'}`, margin + contentWidth - 4, footerY + 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorised Signatory', margin + contentWidth - 4, margin + 276.5, { align: 'right' });

  // 11. Computer Generated Stamp Tag at bottom
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a computer-generated Tax Invoice issued in accordance with GST Rules, 2017.',
    margin + contentWidth / 2,
    margin + 280,
    { align: 'center' }
  );

  const safeNum = (invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`${safeNum}.pdf`);
}

export default downloadPDF;
