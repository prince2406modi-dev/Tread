import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function downloadPDF(invoice) {
    const doc = new jsPDF("p", "mm", "a4");

    //Header
    doc.setFontSize(24);
    doc.text("TAX INVOICE", 80, 10);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PRIYA SALES", 15, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text("SECTOR 53, VILL-GIJHOR, , NOIDA", 15, 24);
    doc.text("Gautambuddha Nagar, Uttar Pradesh, 201301", 15, 29);

    // Invoice title
    doc.setFontSize(24);
    doc.setFont("helvetica", "normal");
    

    // =========================
    // INVOICE INFORMATION
    // =========================

    autoTable(doc, {
        startY: 45,

        theme: "grid",

        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 55 },
            2: { cellWidth: 35 },
            3: { cellWidth: 55 }
        },

        body: [
            [
                "Invoice #",
                invoice.invoiceNumber,
                "Invoice Date",
                invoice.invoiceDate
            ],
            [
                "Terms",
                "Due on Receipt",
                "Due Date",
                invoice.dueDate
            ]
        ],

        styles: {
            fontSize: 8,
            cellPadding: 3
        }
    });

    // =========================
    // BILL TO / SHIP TO
    // =========================

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY,

        theme: "grid",

        head: [
            [
                "Bill To",
                "Ship To"
            ]
        ],

        body: [
            [
                `Mr. ${invoice.customerName}\n${invoice.customerAddress}\n${invoice.customerPhone}`,
                `${invoice.shipToName || invoice.customerName}\n${invoice.shipToAddress || invoice.customerAddress}`
            ]
        ],

        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 90 }
        },

        headStyles: {
            fontSize: 8
        },

        bodyStyles: {
            fontSize: 8,
            minCellHeight: 25
        }
    });

    // =========================
    // PRODUCTS TABLE
    // =========================

    const items = invoice.items.map((item, index) => [
        index + 1,
        `${item.description || ""}`,
        `${item.itemQty}`,
        `Rs. ${item.itemRate}`,
        `Rs. ${item.Qty * item.itemRate}`
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY,

        theme: "grid",

        head: [
            [
                "#",
                "Item & Description",
                "Qty",
                "Rate",
                "Amount"
            ]
        ],

        body: items,

        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 90 },
            2: { cellWidth: 20 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 }
        },

        headStyles: {
            fontSize: 8,
            fontStyle: "bold"
        },

        bodyStyles: {
            fontSize: 8,
            cellPadding: 3
        }
    });

    // =========================
    // SUB TOTAL
    // =========================

    const subtotal = invoice.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
    );

    const tax = subtotal * (invoice.taxRate / 100);
    const total = subtotal + tax;

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY,

        theme: "grid",

        body: [
            [
                {
                    content: "Sub Total",
                    colSpan: 4,
                    styles: {
                        halign: "right",
                        fontStyle: "bold"
                    }
                },
                {
                    content: `Rs. ${subtotal.toFixed(2)}`,
                    styles: {
                        halign: "right"
                    }
                }
            ]
        ],

        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 90 },
            2: { cellWidth: 20 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 }
        }
    });

    // =========================
    // THANK YOU + TOTAL BOX
    // =========================

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY,

        theme: "grid",

        body: [
            [
                {
                    content:
                        "Thanks for shopping with us.\n\n" +
                        "Terms & Conditions\n" +
                        "Full payment is due upon receipt of this invoice.\n" +
                        "Late payments may incur additional charges or interest as per the applicable laws.",
                    styles: {
                        cellWidth: 100,
                        fontSize: 8
                    }
                },
                {
                    content:
                        `Tax Rate       ${invoice.taxRate}%\n\n` +
                        `Total          Rs. ${total.toFixed(2)}\n\n` +
                        `Balance Due    Rs. ${total.toFixed(2)}`,
                    styles: {
                        cellWidth: 80,
                        fontSize: 9,
                        fontStyle: "bold"
                    }
                }
            ]
        ],

        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 80 }
        }
    });

    // =========================
    // SAVE
    // =========================

    doc.save("Invoice.pdf");
}

export default downloadPDF;