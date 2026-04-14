import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportRecord {
    readonly product_name: string;
    readonly category: string;
    readonly purchases_qty: number;
    readonly sales_qty: number;
    readonly closing_stock: number;
    readonly unit_price: number;
}

export interface PDFReportData {
    title: string;
    date: string;
    companyName: string;
    summary: {
        totalProducts: number;
        totalPurchases: number;
        totalSales: number;
        totalRevenue: number;
        totalProfit: number;
    };
    records: readonly ReportRecord[];
    totals: {
        total_purchase_value: number;
        total_sales_value: number;
        total_gross_profit: number;
        total_expenses: number;
        net_profit: number;
    };
}

export const generatePdfReport = async (data: PDFReportData) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Fetch Roboto font dynamically to support '₹' symbol correctly
    try {
        const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf";
        const fontRes = await fetch(fontUrl);
        const fontBuffer = await fontRes.arrayBuffer();
        
        let binary = '';
        const bytes = new Uint8Array(fontBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const fontBase64 = window.btoa(binary);
        
        doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
    } catch (err) {
        console.warn("Failed to load Roboto font, falling back to standard encoding.", err);
    } // continue anyway

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = 20;

    // --- 1. HEADER SECTION (Enterprise Style) ---
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255); // White
    
    // Company Name (Chaitanya Dairy)
    doc.setFont("Roboto", "normal");
    doc.setFontSize(26);
    doc.text(data.companyName, pageWidth / 2, 20, { align: 'center' });

    // Report Title
    doc.setFontSize(12);
    doc.text(data.title.toUpperCase(), pageWidth / 2, 28, { align: 'center' });

    // Date Info
    doc.setFontSize(9);
    doc.text(`Report Date: ${data.date}  |  Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 36, { align: 'center' });

    currentY = 60;

    // --- 2. SUMMARY SECTION (Dashboard Cards) ---
    const colWidth = (pageWidth - (margin * 2)) / 5;
    const boxMargin = 2;
    const summaryItems = [
        { label: 'PRODUCTS', value: data.summary.totalProducts.toString(), color: [71, 85, 105] as [number, number, number] },
        { label: 'PURCHASES', value: `₹${data.summary.totalPurchases.toLocaleString()}`, color: [30, 64, 175] as [number, number, number] },
        { label: 'SALES', value: `₹${data.summary.totalSales.toLocaleString()}`, color: [30, 64, 175] as [number, number, number] },
        { label: 'REVENUE', value: `₹${data.summary.totalRevenue.toLocaleString()}`, color: [30, 64, 175] as [number, number, number] },
        { label: 'NET PROFIT', value: `₹${data.summary.totalProfit.toLocaleString()}`, color: data.summary.totalProfit >= 0 ? [5, 150, 105] as [number, number, number] : [225, 29, 72] as [number, number, number] }
    ];

    doc.setFont("Roboto", "normal");

    summaryItems.forEach((item, i) => {
        const x = margin + (i * colWidth);
        const w = colWidth - (boxMargin * 2);
        
        // Draw card box
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + boxMargin, currentY, w, 25, 2, 2, 'FD');
        
        // Label
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(item.label, x + (colWidth / 2), currentY + 8, { align: 'center' });
        
        // Value
        doc.setFontSize(9);
        const [r, g, b] = item.color;
        doc.setTextColor(r, g, b);
        doc.text(item.value, x + (colWidth / 2), currentY + 18, { align: 'center' });
    });

    currentY += 35;

    // --- 3. TABLE SECTION (AutoTable) ---
    const tableHeaders = [['S.No', 'Product Name', 'Category', 'Purchased', 'Sold', 'Stock', 'Unit Price', 'Total Value']];
    const tableRows = data.records.map((r, i) => [
        i + 1,
        r.product_name || 'N/A',
        r.category || 'N/A',
        r.purchases_qty,
        r.sales_qty,
        r.closing_stock,
        `₹${(r.unit_price || 0).toFixed(2)}`,
        `₹${((r.unit_price || 0) * (r.sales_qty || 0)).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: { 
            fillColor: [59, 130, 246], 
            textColor: 255, 
            fontSize: 9, 
            halign: 'center',
            font: 'Roboto'
        },
        bodyStyles: { 
            fontSize: 8, 
            halign: 'center', 
            textColor: 51,
            font: 'Roboto' 
        },
        alternateRowStyles: { 
            fillColor: [241, 245, 249] // Slate-100
        },
        margin: { left: margin, right: margin },
        styles: { cellPadding: 3 },
        didDrawPage: (data) => {
            currentY = data.cursor ? data.cursor.y : currentY;
        }
    });

    // --- 4. FOOTER SECTION ---
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY += 15;
    }

    // Grand Totals Summary
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    
    doc.text("Daily Summary Totals", margin, currentY);
    
    doc.setFontSize(9);
    const totalLine1 = `Total Revenue: ₹${data.totals.total_sales_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}    |    Total Expenses: ₹${data.totals.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    doc.text(totalLine1, margin, currentY + 8);

    const totalLine2 = `Final Net Daily Profit: ₹${data.totals.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const [profitR, profitG, profitB] = data.totals.net_profit >= 0 ? [5, 150, 105] : [225, 29, 72];
    doc.setTextColor(profitR, profitG, profitB);
    doc.text(totalLine2, margin, currentY + 16);

    // Signature Area
    currentY += 35;
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.line(margin, currentY, margin + 50, currentY);
    doc.line(pageWidth - margin - 50, currentY, pageWidth - margin, currentY);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Authorized Signature", margin, currentY + 5);
    doc.text("Manager's Approval", pageWidth - margin, currentY + 5, { align: 'right' });

    // Official System Footer
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Generated Automatically by Chaitanya Dairy Management System", pageWidth / 2, footerY, { align: 'center' });

    // SAVE THE FILE
    doc.save(`Summary_Report_${data.date}.pdf`);
};
