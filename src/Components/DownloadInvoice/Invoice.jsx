import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function downloadPDF(invoice, company = null) {
    if (!invoice) return;

    const doc = new jsPDF("p", "mm", "a4");

    const compName = company?.name || "TREAD BILLING ENTERPRISE";
    const compGstin = company?.gstin ? `GSTIN: ${company.gstin}` : "";
    const compAddress = company?.address || "Commercial Plaza, Sector 18";
    const compCity = company?.cityState ? `${company.cityState} - ${company.pincode || ""}` : "New Delhi, India";
    const compPhone = company?.phone ? `Phone: ${company.phone}` : "";
    const compEmail = company?.email ? `Email: ${company.email}` : "";

    // Header Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("TAX INVOICE", 140, 18);

    // Company Header Info
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 110, 253);
    doc.text(compName.toUpperCase(), 15, 18);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    
    let yPos = 24;
    if (compGstin) {
        doc.text(compGstin, 15, yPos);
        yPos += 5;
    }
    doc.text(compAddress, 15, yPos);
    yPos += 5;
    doc.text(compCity, 15, yPos);
    yPos += 5;
    if (compPhone || compEmail) {
        doc.text([compPhone, compEmail].filter(Boolean).join(" | "), 15, yPos);
        yPos += 5;
    }

    // =========================
    // INVOICE METADATA TABLE
    // =========================
    autoTable(doc, {
        startY: Math.max(yPos + 3, 44),
        theme: "grid",
        headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8.5, cellPadding: 3, textColor: [31, 41, 55] },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: "bold", fillColor: [249, 250, 251] },
            1: { cellWidth: 55 },
            2: { cellWidth: 35, fontStyle: "bold", fillColor: [249, 250, 251] },
            3: { cellWidth: 55 }
        },
        body: [
            [
                "Invoice Number:",
                invoice.invoiceNumber || "INV-DRAFT",
                "Invoice Date:",
                invoice.invoiceDate || new Date().toISOString().slice(0, 10)
            ],
            [
                "Payment Terms:",
                "Due on Receipt",
                "Place of Supply:",
                company?.state || "State (07)"
            ]
        ]
    });

    // =========================
    // BILL TO / SHIP TO
    // =========================
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        head: [
            ["Billed To (Customer Details)", "Shipping / Delivery Details"]
        ],
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontSize: 8.5, fontStyle: "bold" },
        body: [
            [
                `${invoice.customerName || "Valued Customer"}\n${invoice.customerAddress ? invoice.customerAddress + "\n" : ""}${invoice.customerPhone ? "Phone: " + invoice.customerPhone : ""}`,
                `${invoice.shipToName || invoice.customerName || "Same as Billing"}\n${invoice.shipToAddress || invoice.customerAddress || ""}`
            ]
        ],
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 90 }
        },
        bodyStyles: {
            fontSize: 8.5,
            minCellHeight: 18,
            cellPadding: 3.5,
            textColor: [31, 41, 55]
        }
    });

    // =========================
    // LINE ITEMS TABLE
    // =========================
    const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
    
    let calcSubtotal = 0;
    let calcTotalGst = 0;

    const tableRows = rawItems.map((item, index) => {
        const desc = item.description || item.name || `Item ${index + 1}`;
        const qty = Number(item.quantity ?? item.itemQty ?? 1);
        const rate = Number(item.rate ?? item.itemRate ?? item.price ?? 0);
        const gst = Number(item.gstPercent ?? item.gst ?? 0);
        
        const lineAmount = qty * rate;
        const lineGst = (lineAmount * gst) / 100;
        const lineTotal = lineAmount + lineGst;

        calcSubtotal += lineAmount;
        calcTotalGst += lineGst;

        return [
            index + 1,
            desc,
            qty.toString(),
            `₹${rate.toFixed(2)}`,
            `${gst}%`,
            `₹${lineGst.toFixed(2)}`,
            `₹${lineTotal.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "striped",
        head: [
            ["#", "Item Description", "Qty", "Rate (₹)", "GST %", "GST Amt", "Total (₹)"]
        ],
        body: tableRows.length > 0 ? tableRows : [["-", "No items recorded", "-", "-", "-", "-", "-"]],
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: 255,
            fontSize: 8,
            fontStyle: "bold"
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 70 },
            2: { cellWidth: 15, halign: "right" },
            3: { cellWidth: 25, halign: "right" },
            4: { cellWidth: 18, halign: "center" },
            5: { cellWidth: 20, halign: "right" },
            6: { cellWidth: 22, halign: "right" }
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 2.8,
            textColor: [31, 41, 55]
        }
    });

    // =========================
    // SUMMARY / TOTALS SECTION
    // =========================
    const grandTotal = calcSubtotal + calcTotalGst;

    const termsText = company?.terms || 
        "1. Full payment is due upon receipt of this invoice.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.";
    const bankDetails = company?.bankName ? 
        `\nBank: ${company.bankName} | A/C: ${company.accountNumber || "N/A"} | IFSC: ${company.ifsc || "N/A"}` : "";

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        body: [
            [
                {
                    content: `Terms & Conditions / Bank Details:\n${termsText}${bankDetails}`,
                    styles: { cellWidth: 105, fontSize: 7.5, textColor: [75, 85, 99], cellPadding: 3 }
                },
                {
                    content: 
                        `Taxable Subtotal:  ₹${calcSubtotal.toFixed(2)}\n` +
                        `Total GST:         ₹${calcTotalGst.toFixed(2)}\n` +
                        `---------------------------------\n` +
                        `Grand Total:       ₹${grandTotal.toFixed(2)}`,
                    styles: { cellWidth: 75, fontSize: 8.5, fontStyle: "bold", halign: "right", cellPadding: 3, textColor: [17, 24, 39] }
                }
            ]
        ]
    });

    // Signature Area
    const finalY = doc.lastAutoTable.finalY + 12;
    if (finalY < 275) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("For " + compName.toUpperCase(), 145, finalY);
        doc.text("Authorized Signatory", 145, finalY + 14);
    }

    const filename = `${(invoice.invoiceNumber || "Invoice").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
    doc.save(filename);
}

export default downloadPDF;