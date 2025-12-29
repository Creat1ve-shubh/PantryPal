import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface InvoiceItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
}

interface InvoiceData {
    billNumber: string;
    date: Date;
    customerName?: string;
    customerPhone?: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    organizationName: string;
    organizationAddress?: string;
}

export const generateInvoicePDF = (data: InvoiceData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(data.organizationName, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    if (data.organizationAddress) {
        doc.text(data.organizationAddress, 14, 28);
    }

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("INVOICE", pageWidth - 14, 22, { align: "right" });

    doc.setFontSize(10);
    doc.text(`#${data.billNumber}`, pageWidth - 14, 28, { align: "right" });

    // Divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 35, pageWidth - 14, 35);

    // Bill Info
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("Bill To:", 14, 45);
    doc.setTextColor(15, 23, 42);
    doc.text(data.customerName || "Walking Customer", 14, 50);
    if (data.customerPhone) {
        doc.text(data.customerPhone, 14, 55);
    }

    doc.setTextColor(71, 85, 105);
    doc.text("Date:", pageWidth - 14 - 40, 45);
    doc.setTextColor(15, 23, 42);
    doc.text(format(data.date, "PPP"), pageWidth - 14, 45, { align: "right" });

    // Items Table
    autoTable(doc, {
        startY: 65,
        head: [["Item", "Qty", "Price", "Amount"]],
        body: data.items.map((item) => [
            item.name,
            item.quantity.toString(),
            `$${item.price.toFixed(2)}`,
            `$${item.total.toFixed(2)}`,
        ]),
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: "bold",
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [30, 41, 59],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        margin: { top: 65 },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotal:", pageWidth - 60, finalY);
    doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - 14, finalY, { align: "right" });

    doc.text("Tax:", pageWidth - 60, finalY + 6);
    doc.text(`$${data.tax.toFixed(2)}`, pageWidth - 14, finalY + 6, { align: "right" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Total:", pageWidth - 60, finalY + 14);
    doc.text(`$${data.total.toFixed(2)}`, pageWidth - 14, finalY + 14, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Thank you for your business!", pageWidth / 2, pageWidth > 200 ? 280 : 270, { align: "center" });

    // Save PDF
    doc.save(`invoice-${data.billNumber}.pdf`);
};
