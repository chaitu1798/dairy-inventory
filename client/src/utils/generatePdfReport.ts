import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportRecord {
    readonly product_name: string;
    readonly category: string;
    readonly purchases_qty: number;
    readonly sales_qty: number;
    readonly counter_sales_qty?: number;
    readonly distribution_sales_qty?: number;
    readonly closing_stock: number;
    readonly opening_stock?: number;
    readonly unit_price: number;
    readonly total_sales_value?: number;
    readonly counter_sales_value?: number;
    readonly distribution_sales_value?: number;
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
    // 1. Report Layout: A4 landscape format
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Fetch Roboto font dynamically to support '₹' symbol
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
        doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
        doc.setFont("Roboto");
    } catch (err) {
        console.warn("Failed to load Roboto font", err);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let currentY = 15;

    // --- 2. HEADER SECTION ---
    // Enclosed inside bordered section
    doc.setDrawColor(0); // Thin black border
    doc.setLineWidth(0.5);
    doc.rect(margin, currentY, pageWidth - margin * 2, 25);
    
    // Company/Dairy Name at top center in bold red
    doc.setFont("Roboto", "bold");
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text(data.companyName.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });

    // Report title in blue bold text
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(data.title.toUpperCase(), pageWidth / 2, currentY + 16, { align: 'center' });

    // Branch, Date, Generated timestamp
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("Branch: Main Branch", margin + 5, currentY + 22);
    doc.text(`Report Date: ${data.date}`, pageWidth / 2, currentY + 22, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - margin - 5, currentY + 22, { align: 'right' });

    currentY += 30;

    // Filter active records
    const activeRecords = data.records.filter(r => (r.purchases_qty || 0) > 0 || (r.sales_qty || 0) > 0);
    const totalPurchaseQty = activeRecords.reduce((sum, r) => sum + (r.purchases_qty || 0), 0);
    const totalCounterQty = activeRecords.reduce((sum, r) => sum + (r.counter_sales_qty || 0), 0);
    const totalDistQty = activeRecords.reduce((sum, r) => sum + (r.distribution_sales_qty || 0), 0);

    // --- 3. COMPACT SUMMARY SECTION ---
    // Single-row summary table, light gray bg, bold labels
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'F');
    doc.setDrawColor(0);
    doc.rect(margin, currentY, pageWidth - margin * 2, 10);
    
    doc.setFont("Roboto", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);
    
    const summaryText = `Total Active Products: ${activeRecords.length}   |   Total Purchase Qty: ${totalPurchaseQty}   |   Counter Sales Qty: ${totalCounterQty}   |   Dist Sales Qty: ${totalDistQty}   |   Total Revenue: ₹${data.totals.total_sales_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}   |   Net Profit: ₹${data.totals.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    
    doc.text(summaryText, pageWidth / 2, currentY + 6, { align: 'center' });

    currentY += 15;

    // --- 4 & 5. MAIN INVENTORY TABLE WITH GROUPED HEADERS ---
    const tableHeaders: any[] = [
        [
            { content: 'S.No', rowSpan: 2 },
            { content: 'Product Name', rowSpan: 2 },
            { content: 'Opening\nStock', rowSpan: 2 },
            { content: 'Purchase\nQty', rowSpan: 2 },
            { content: 'Total\nStock', rowSpan: 2 },
            { content: 'Counter Sales', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Distribution Sales', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Total\nSold', rowSpan: 2 },
            { content: 'Closing\nStock', rowSpan: 2 },
            { content: 'Unit\nPrice', rowSpan: 2 },
            { content: 'Total\nRevenue', rowSpan: 2 }
        ],
        [
            'Qty', 'Amount', 'Qty', 'Amount'
        ]
    ];

    let sumPurchases = 0;
    let sumCounterQty = 0;
    let sumCounterValue = 0;
    let sumDistQty = 0;
    let sumDistValue = 0;
    let sumTotalSold = 0;
    let sumTotalRevenue = 0;
    let sumClosingStock = 0;

    const tableRows = activeRecords.map((r, i) => {
        const totalStock = (r.opening_stock || 0) + (r.purchases_qty || 0);
        const counterQty = r.counter_sales_qty || 0;
        const counterVal = r.counter_sales_value || 0;
        const distQty = r.distribution_sales_qty || 0;
        const distVal = r.distribution_sales_value || 0;
        const totalSold = counterQty + distQty;
        const totalRev = counterVal + distVal;
        const closingStock = totalStock - totalSold;

        // Add to totals
        sumPurchases += r.purchases_qty || 0;
        sumCounterQty += counterQty;
        sumCounterValue += counterVal;
        sumDistQty += distQty;
        sumDistValue += distVal;
        sumTotalSold += totalSold;
        sumTotalRevenue += totalRev;
        sumClosingStock += closingStock;

        return [
            i + 1,
            r.product_name || 'N/A',
            r.opening_stock || 0,
            r.purchases_qty || 0,
            totalStock,
            counterQty,
            `₹${counterVal.toFixed(2)}`,
            distQty,
            `₹${distVal.toFixed(2)}`,
            totalSold,
            closingStock,
            `₹${(r.unit_price || 0).toFixed(2)}`,
            `₹${totalRev.toFixed(2)}`
        ];
    });

    // 7. TOTALS ROW
    tableRows.push([
        '', 
        'TOTALS', 
        '', 
        sumPurchases as any, 
        '', 
        sumCounterQty as any, 
        `₹${sumCounterValue.toFixed(2)}`, 
        sumDistQty as any, 
        `₹${sumDistValue.toFixed(2)}`, 
        sumTotalSold as any, 
        sumClosingStock as any, 
        '', 
        `₹${sumTotalRevenue.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        theme: 'grid', // Accounting style
        styles: { 
            font: 'Roboto',
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: 0
        },
        headStyles: {
            fillColor: [241, 245, 249], // Light gray
            textColor: 0,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        bodyStyles: {
            halign: 'center'
        },
        columnStyles: {
            1: { halign: 'left' } // Product Name left aligned
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        willDrawCell: function(data) {
            // Check if it is the Totals row (the last row)
            if (data.row.index === tableRows.length - 1 && data.section === 'body') {
                doc.setFont("Roboto", "bold");
                doc.setFillColor(226, 232, 240); // Dark gray bg for totals
            }
        },
        didDrawPage: (data) => {
            currentY = data.cursor ? data.cursor.y : currentY;
        }
    });

    currentY += 15;
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
    }

    // --- 8. REVENUE SUMMARY FOOTER ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY); // Top separator line
    
    currentY += 10;
    
    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.text("FINANCIAL SUMMARY:", margin, currentY);
    
    currentY += 8;
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.text(`Total Revenue: ₹${data.totals.total_sales_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin, currentY);
    doc.text(`Total Expenses: ₹${data.totals.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin + 60, currentY);
    
    const profit = data.totals.net_profit;
    doc.setFont("Roboto", "bold");
    doc.text(`Net Profit: ₹${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin + 120, currentY);
    
    currentY += 5;
    doc.line(margin, currentY, pageWidth - margin, currentY); // Bottom separator line

    // --- 9. SIGNATURE SECTION ---
    currentY += 35;
    if (currentY > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        currentY = 40;
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    
    // Left signature
    doc.line(margin, currentY, margin + 40, currentY);
    doc.setFont("Roboto", "bold");
    doc.text("Authorized Signature", margin, currentY + 5);

    // Right signature
    doc.line(pageWidth - margin - 40, currentY, pageWidth - margin, currentY);
    doc.text("Manager's Approval", pageWidth - margin - 40, currentY + 5);

    // SAVE THE FILE
    doc.save(`Dairy_Ledger_Report_${data.date}.pdf`);
};
