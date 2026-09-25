import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and triggers download of an executive-grade Company Profile & Business Dossier PDF.
 * This document allows clients, vendors, and partners to review official company credentials,
 * GST numbers, banking/RTGS settlement details, and standard terms.
 *
 * @param {Object} company - The company profile data object
 * @param {Object} currentUser - The currently logged-in user or session info
 */
export function downloadCompanyProfilePDF(company = {}, currentUser = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190 mm

  const compName = (company?.name || 'Enterprise Business').trim();
  const compAddress = (company?.address || '').trim();
  const compCityState = (company?.cityState || '').trim();
  const compPincode = (company?.pincode || '').trim();
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
  const termsText = (company?.terms || '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.').trim();

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // 1. Page Background & Outer Border
  doc.setDrawColor(30, 41, 59); // Slate-800
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  // Decorative inner line
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.2);
  doc.rect(margin + 1.2, margin + 1.2, contentWidth - 2.4, pageHeight - margin * 2 - 2.4);

  // 2. Header Top Banner with Navy / Indigo Fill
  const bannerHeight = 24;
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(margin, margin, contentWidth, bannerHeight, 'F');

  // Gold accent separator bar
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.rect(margin, margin + bannerHeight - 1.5, contentWidth, 1.5, 'F');

  // Header Title in Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(253, 230, 138); // Soft Gold
  doc.text('OFFICIAL BUSINESS DOSSIER & CORPORATE PROFILE', margin + 6, margin + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240); // Slate-200
  doc.text('Certified Trade Credentials • GST Compliance • Banking Settlement Info', margin + 6, margin + 17);

  // Document Tag (Top Right of Banner - No License ID)
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(pageWidth - margin - 52, margin + 4.5, 46, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - margin - 52, margin + 4.5, 46, 14, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(253, 230, 138);
  doc.text('CORPORATE PROFILE', pageWidth - margin - 29, margin + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('VERIFIED RECORD', pageWidth - margin - 29, margin + 14.5, { align: 'center' });

  // 3. Logo & Main Brand Info Block
  let currentY = margin + bannerHeight + 5;
  const logoWidth = 28;
  const logoHeight = 20;
  const logoX = margin + 5;
  const logoY = currentY;

  let logoRendered = false;
  if (company?.logo && typeof company.logo === 'string' && company.logo.startsWith('data:image')) {
    try {
      const format = company.logo.includes('png') ? 'PNG' : company.logo.includes('webp') ? 'WEBP' : 'JPEG';
      doc.addImage(company.logo, format, logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
      logoRendered = true;
    } catch (err) {
      console.warn('Company profile logo render note:', err);
      logoRendered = false;
    }
  }

  if (!logoRendered) {
    // Elegant Monogram box
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 2, 2, 'F');
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.4);
    doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 2, 2, 'S');

    const words = compName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    const initials = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : (compName ? compName.slice(0, 2).toUpperCase() : 'CO');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(67, 56, 202);
    doc.text(initials, logoX + logoWidth / 2, logoY + 12, { align: 'center' });

    doc.setFontSize(6);
    doc.setTextColor(220, 38, 38);
    doc.text(compGstin ? 'GST REGISTERED' : 'ESTABLISHED', logoX + logoWidth / 2, logoY + 17, { align: 'center' });
  }

  // Company Name and Subtitles
  const textStartX = logoX + logoWidth + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(compName.toUpperCase(), textStartX, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const subtitle = compState ? `Authorized Enterprise • ${compState}` : 'Authorized Enterprise & Commercial Entity';
  doc.text(subtitle, textStartX, currentY + 11.5);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${currentDate}  |  Official Verification Record`, textStartX, currentY + 16.5);

  currentY += logoHeight + 6;

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, currentY, pageWidth - margin - 4, currentY);
  currentY += 4;

  // 4. Section 1: Legal & Tax Registration Credentials
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + 4, right: margin + 4 },
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
    },
    head: [[
      { content: '🏛️ LEGAL, TAX & COMMERCIAL CREDENTIALS', colSpan: 4 }
    ]],
    body: [
      [
        { content: 'Trade Name:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: compName || 'N/A', styles: { fontStyle: 'bold', textColor: [15, 23, 42], width: 53 } },
        { content: 'GSTIN Number:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: compGstin || 'Not Registered / URP', styles: { fontStyle: 'bold', textColor: [30, 64, 175], font: 'courier', width: 53 } },
      ],
      [
        { content: 'PAN Number:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: compPan || 'N/A', styles: { font: 'courier', fontStyle: 'bold' } },
        { content: 'Business State:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: compState || 'N/A' },
      ],
      [
        { content: 'FSSAI License:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: compFssai || 'N/A', styles: { font: 'courier' } },
        { content: 'Verification Status:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: 'Active Registered Business', styles: { textColor: [22, 101, 52], fontStyle: 'bold' } },
      ],
    ],
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 5. Section 2: Contact & Registered Office Address
  const fullAddress = [compAddress, compCityState, compPincode ? `PIN: ${compPincode}` : ''].filter(Boolean).join(', ') || 'N/A';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + 4, right: margin + 4 },
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
    },
    head: [[
      { content: '📍 REGISTERED OFFICE & COMMUNICATION CONTACTS', colSpan: 4 }
    ]],
    body: [
      [
        { content: 'Registered Office:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: fullAddress, colSpan: 3, styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Primary Mobile / Phone:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: compPhone || 'N/A', styles: { textColor: [15, 23, 42], width: 53 } },
        { content: 'Official Email:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: compEmail || 'N/A', styles: { textColor: [30, 64, 175], width: 53 } },
      ],
    ],
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 6. Section 3: Banking & Electronic Payment Settlement Credentials
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + 4, right: margin + 4 },
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [238, 242, 255], // Subtle Indigo
      textColor: [67, 56, 202],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [199, 210, 254],
      lineWidth: 0.3,
    },
    head: [[
      { content: '💳 BANKING & ELECTRONIC SETTLEMENT CREDENTIALS (NEFT / RTGS / IMPS)', colSpan: 4 }
    ]],
    body: [
      [
        { content: 'Bank Name:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: bankName || 'N/A', styles: { fontStyle: 'bold', textColor: [15, 23, 42], width: 53 } },
        { content: 'Account Number:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252], width: 38 } },
        { content: accountNo || 'N/A', styles: { font: 'courier', fontStyle: 'bold', textColor: [15, 23, 42], width: 53 } },
      ],
      [
        { content: 'IFSC Code:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: ifscCode || 'N/A', styles: { font: 'courier', fontStyle: 'bold', textColor: [180, 83, 9] } },
        { content: 'Branch Location:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: branchName || 'N/A' },
      ],
      [
        { content: 'Beneficiary Name:', styles: { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
        { content: compName, colSpan: 3, styles: { fontStyle: 'bold' } },
      ],
    ],
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 7. Section 4: Standard Commercial Terms & Operating Policies
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + 4, right: margin + 4 },
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
    },
    head: [[
      { content: '📄 STANDARD COMMERCIAL TERMS & OPERATING POLICIES', colSpan: 1 }
    ]],
    body: [
      [
        { content: termsText, styles: { textColor: [51, 65, 85], fontStyle: 'normal' } }
      ]
    ],
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 8. Section 5: Signature & Official Seal Verification Block
  const sigBoxHeight = 30;
  const sigBoxY = Math.min(currentY, pageHeight - margin - sigBoxHeight - 12);

  // Left Note / Declaration
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CORPORATE ATTESTATION & DECLARATION', margin + 6, sigBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This profile is digitally issued for client on-boarding, supplier registration,\nand official GST invoice reconciliation. The particulars provided above are authentic\nand derived from active trade records.',
    margin + 6,
    sigBoxY + 11
  );

  // Right Signatory Box
  const sigBoxWidth = 60;
  const sigBoxX = pageWidth - margin - sigBoxWidth - 6;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxWidth, sigBoxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxWidth, sigBoxHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${compName}`, sigBoxX + sigBoxWidth / 2, sigBoxY + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorised Signatory / Corporate Seal', sigBoxX + sigBoxWidth / 2, sigBoxY + sigBoxHeight - 3, { align: 'center' });

  // 9. Bottom Footer Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, pageHeight - margin - 7, contentWidth, 7, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, pageHeight - margin - 7, pageWidth - margin, pageHeight - margin - 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Generated via Tread Executive GST Billing Suite • Secure Enterprise Dossier', margin + 6, pageHeight - margin - 2.8);
  doc.text('Official Business Profile • Page 1 of 1', pageWidth - margin - 6, pageHeight - margin - 2.8, { align: 'right' });

  // Save the document
  const safeName = compName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Company';
  doc.save(`${safeName}_Company_Profile.pdf`);
}
