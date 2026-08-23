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

  let result = 'Rupees ' + words;

  const paise = parseInt(paisePart, 10);
  if (paise > 0) {
    result += ' and ' + numToWordsUnderThousand(paise) + ' Paise';
  }

  return result + ' Only';
}

function downloadPDF(invoice, company = null, copyType = 'Original Copy') {
  if (!invoice) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 10;
  const contentWidth = 190;

  // Defaults based on standard format
  const compName = company?.name || 'M/S PRIYA SALES';
  const compAddress = company?.address || 'SECTOR 53, VILL-GIJHOR, , NOIDA, Gautambuddha Nagar, Uttar Pradesh, 201301';
  const compGstin = company?.gstin || '09ARGPM9069G1Z9';
  const compFssai = company?.fssai || '12724055000459';
  const compPhone = company?.phone || '9871772123, 9717183141';
  const compState = company?.state || 'Uttar Pradesh (09)';
  const bankName = company?.bankName || 'UNION BANK OF INDIA';
  const accountNo = company?.accountNumber || '135811011000257';
  const ifscCode = company?.ifsc || 'UBIN0813583';

  // 1. Full Page Outer Box Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, margin, contentWidth, 277);

  // 2. Top Right Copy Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(copyType || 'Original Copy', pageWidth - margin - 2, margin + 4, { align: 'right' });

  // 3. Logo Box (Left)
  const logoX = margin + 3;
  const logoY = margin + 4;
  doc.setDrawColor(13, 110, 253);
  doc.setLineWidth(0.5);
  doc.roundedRect(logoX, logoY, 28, 14, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(13, 110, 253);
  doc.text('PS', logoX + 14, logoY + 9.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(220, 53, 69);
  doc.text('PRIYA SALES', logoX + 14, logoY + 18, { align: 'center' });

  // 4. Header Center Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TAX INVOICE', margin + contentWidth / 2, margin + 6, { align: 'center' });

  doc.setFontSize(13);
  doc.text(compName.toUpperCase(), margin + contentWidth / 2, margin + 11.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text(compAddress, margin + contentWidth / 2, margin + 15.5, { align: 'center', maxWidth: 120 });
  doc.text(`GSTIN : ${compGstin}`, margin + contentWidth / 2, margin + 19.5, { align: 'center' });
  doc.text(`FSSAI Lic. No. : ${compFssai}`, margin + contentWidth / 2, margin + 23, { align: 'center' });
  doc.text(`Mob. : ${compPhone}`, margin + contentWidth / 2, margin + 26.5, { align: 'center' });

  const headerBottomY = margin + 28.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, headerBottomY, margin + contentWidth, headerBottomY);

  // 5. Metadata Row (Invoice No, Date, Place of Supply, Reverse Charge)
  const metaY = headerBottomY;
  const metaHeight = 10;
  const midX = margin + contentWidth / 2;

  doc.line(midX, metaY, midX, metaY + metaHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  // Left meta
  doc.text('Invoice No.', margin + 2, metaY + 4);
  doc.text(`:  ${invoice.invoiceNumber || '1092/2026-27'}`, margin + 24, metaY + 4);

  doc.text('Dated', margin + 2, metaY + 8);
  const formattedDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-')
    : new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  doc.text(`:  ${formattedDate}`, margin + 24, metaY + 8);

  // Right meta
  doc.text('Place of Supply', midX + 2, metaY + 4);
  doc.text(`:  ${invoice.placeOfSupply || compState}`, midX + 28, metaY + 4);

  doc.text('Reverse Charge', midX + 2, metaY + 8);
  doc.text(`:  ${invoice.reverseCharge || 'N'}`, midX + 28, metaY + 8);

  const metaBottomY = metaY + metaHeight;
  doc.line(margin, metaBottomY, margin + contentWidth, metaBottomY);

  // 6. Party Information Box (Billed to / Shipped to)
  const partyY = metaBottomY;
  const partyHeight = 31;
  doc.line(midX, partyY, midX, partyY + partyHeight);

  // Left (Billed To)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Billed to   :', margin + 2, partyY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text((invoice.customerName || 'GULATI CATERERS').toUpperCase(), margin + 2, partyY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customerAddress || 'GT-60 , Sector - 70\nNoida', margin + 2, partyY + 12.5, { maxWidth: 85 });

  doc.text('Party E-Mail ID', margin + 2, partyY + 22);
  doc.text(`:  ${invoice.customerEmail || ''}`, margin + 24, partyY + 22);

  doc.text('Party Mobile No', margin + 2, partyY + 25.5);
  doc.text(`:  ${invoice.customerPhone || '7217706305'}`, margin + 24, partyY + 25.5);

  doc.text('GSTIN / UIN', margin + 2, partyY + 29);
  doc.text(`:  ${invoice.customerGstin || '09ABVPG5831F1ZD'}`, margin + 24, partyY + 29);

  // Right (Shipped To)
  doc.text('Shipped to   :', midX + 2, partyY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text((invoice.shipToName || invoice.customerName || 'GULATI CATERERS').toUpperCase(), midX + 2, partyY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.shipToAddress || invoice.customerAddress || 'GT-60 , Sector - 70\nNoida', midX + 2, partyY + 12.5, { maxWidth: 85 });

  doc.text('Party E-Mail ID', midX + 2, partyY + 22);
  doc.text(`:  ${invoice.shipToEmail || invoice.customerEmail || ''}`, midX + 28, partyY + 22);

  doc.text('Party Mobile No', midX + 2, partyY + 25.5);
  doc.text(`:  ${invoice.shipToPhone || invoice.customerPhone || '7217706305'}`, midX + 28, partyY + 25.5);

  doc.text('GSTIN / UIN', midX + 2, partyY + 29);
  doc.text(`:  ${invoice.shipToGstin || invoice.customerGstin || '09ABVPG5831F1ZD'}`, midX + 28, partyY + 29);

  const partyBottomY = partyY + partyHeight;
  doc.line(margin, partyBottomY, margin + contentWidth, partyBottomY);

  // 7. Line Items Table (13 Columns matching Priya Sales format)
  const rawItems = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [
    { description: 'Salted Peanut MRP 10', hsn: '21069099', quantity: 80, unit: 'Laddi', rate: 101.00, gstPercent: 5 },
    { description: 'Chips Salted MRP 15', hsn: '20052000', quantity: 36, unit: 'Laddi', rate: 100.00, gstPercent: 5 },
  ];

  let totalQty = 0;
  let totalGrossAmount = 0;
  let primaryUnit = 'PCS';
  const taxSlabMap = {};

  const tableBody = rawItems.map((item, idx) => {
    const sn = `${idx + 1}.`;
    const desc = item.description || item.name || 'Product';
    const hsn = item.hsn || item.hsnCode || '';
    const qty = Number(item.quantity ?? item.stock ?? 1) || 1;
    const unit = item.unit || 'Laddi';
    primaryUnit = unit;
    totalQty += qty;

    const rate = Number(item.rate ?? item.price ?? 0) || 0;
    const gstPct = Number(item.gstPercent ?? item.gst ?? 0) || 0;

    // Price and tax calculation
    const baseAmount = qty * rate;
    const isInterState = invoice.invoiceType === 'central' || invoice.isInterState || false;
    const halfGstPct = gstPct / 2;

    const totalTax = (baseAmount * gstPct) / 100;
    const cgstAmt = isInterState ? 0 : totalTax / 2;
    const sgstAmt = isInterState ? 0 : totalTax / 2;
    const igstAmt = isInterState ? totalTax : 0;
    const lineTotal = baseAmount + totalTax;

    totalGrossAmount += lineTotal;

    // Accumulate tax slabs
    const slabKey = `${gstPct}%`;
    if (!taxSlabMap[slabKey]) {
      taxSlabMap[slabKey] = { rate: slabKey, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    }
    taxSlabMap[slabKey].taxable += baseAmount;
    taxSlabMap[slabKey].cgst += cgstAmt;
    taxSlabMap[slabKey].sgst += sgstAmt;
    taxSlabMap[slabKey].igst += igstAmt;
    taxSlabMap[slabKey].totalTax += totalTax;

    return [
      sn,
      desc,
      hsn,
      qty.toString(),
      unit,
      rate.toFixed(2),
      isInterState ? '' : `${halfGstPct.toFixed(2)} %`,
      isInterState ? '' : cgstAmt.toFixed(2),
      isInterState ? '' : `${halfGstPct.toFixed(2)} %`,
      isInterState ? '' : sgstAmt.toFixed(2),
      isInterState ? `${gstPct.toFixed(2)} %` : '',
      isInterState ? igstAmt.toFixed(2) : '',
      lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
  });

  autoTable(doc, {
    startY: partyBottomY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    head: [
      [
        { content: 'S.N.', rowSpan: 2, styles: { cellWidth: 7, halign: 'center' } },
        { content: 'Description of Goods', rowSpan: 2, styles: { cellWidth: 46, halign: 'left' } },
        { content: 'HSN/SAC\nCode', rowSpan: 2, styles: { cellWidth: 16, halign: 'center' } },
        { content: 'Qty.', rowSpan: 2, styles: { cellWidth: 10, halign: 'right' } },
        { content: 'Unit', rowSpan: 2, styles: { cellWidth: 11, halign: 'center' } },
        { content: 'Price', rowSpan: 2, styles: { cellWidth: 15, halign: 'right' } },
        { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'IGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Amount(` )', rowSpan: 2, styles: { cellWidth: 23, halign: 'right' } }
      ],
      [
        { content: 'Rate', styles: { cellWidth: 10, halign: 'center' } },
        { content: 'Amount', styles: { cellWidth: 16, halign: 'right' } },
        { content: 'Rate', styles: { cellWidth: 10, halign: 'center' } },
        { content: 'Amount', styles: { cellWidth: 16, halign: 'right' } },
        { content: 'Rate', styles: { cellWidth: 10, halign: 'center' } },
        { content: 'Amount', styles: { cellWidth: 16, halign: 'right' } }
      ]
    ],
    body: tableBody,
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'center' },
      9: { halign: 'right' },
      10: { halign: 'center' },
      11: { halign: 'right' },
      12: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Grand Total Line below items table
  const itemsTableFinalY = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: itemsTableFinalY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      fontSize: 8,
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: 2
    },
    body: [
      [
        { content: 'Grand Total', styles: { halign: 'right', cellWidth: 69 } },
        { content: `${totalQty} ${primaryUnit}`, styles: { halign: 'center', cellWidth: 21 } },
        { content: '', styles: { cellWidth: 77 } },
        {
          content: `\` ${totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          styles: { halign: 'right', cellWidth: 23 }
        }
      ]
    ]
  });

  // 8. Tax Summary Table (Tax Rate | Taxable Amt. | CGST Amt. | SGST Amt. | Total Tax)
  const taxSummaryY = doc.lastAutoTable.finalY + 3;
  const taxRows = Object.values(taxSlabMap).map((s) => [
    s.rate,
    s.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    s.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    s.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    s.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: taxSummaryY,
    margin: { left: margin, right: margin + 90 },
    theme: 'plain',
    tableWidth: 100,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    headStyles: {
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    head: [['Tax Rate', 'Taxable Amt.', 'CGST Amt.', 'SGST Amt.', 'Total Tax']],
    body: taxRows.length > 0 ? taxRows : [['5%', '11,123.82', '278.09', '278.09', '556.18']],
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // 9. Amount in Words & Bank Details
  let curY = doc.lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const amountWords = amountToIndianWords(totalGrossAmount);
  doc.text(amountWords, margin + 2, curY);

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Bank Details :', margin + 2, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(`BANK NAME : ${bankName}`, margin + 24, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`A/C NO. : ${accountNo}`, margin + 24, curY);
  doc.text(`IFSC CODE : ${ifscCode}`, margin + 85, curY);

  // 10. Footer Section (Terms & Conditions | Receiver's Signature & Authorised Signatory)
  const footerY = Math.max(curY + 4, 246);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, margin + contentWidth, footerY);
  doc.line(midX, footerY, midX, margin + 277);

  // Left Footer: Terms & Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Terms & Conditions', margin + 2, footerY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('1. Goods once sold will not be taken back.', margin + 2, footerY + 9.5);
  doc.text('2. Interest @ 18% p.a. will be charged if the payment\n   is not made with in the stipulated time.', margin + 2, footerY + 14);
  doc.text("3. Subject to 'Uttar Pradesh' Jurisdiction only.", margin + 2, footerY + 21);

  // Right Footer: Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("Receiver's Signature   :", midX + 2, footerY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`For ${compName.toUpperCase()}`, margin + contentWidth - 4, footerY + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorised Signatory', margin + contentWidth - 4, margin + 273, { align: 'right' });

  const safeNum = (invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`${safeNum}.pdf`);
}

export default downloadPDF;
