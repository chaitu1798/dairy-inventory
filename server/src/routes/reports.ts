import { Router } from 'express';
import { supabase } from '../supabase';

import { requireAuth } from '../middleware/auth';

const router = Router();

type ProductRow = {
    id: number;
    name: string;
    category: string | null;
    unit: string | null;
    cost_price: number | null;
    min_stock: number | null;
    expiry_date: string | null;
    track_expiry: boolean | null;
};

type MovementRow = {
    product_id: number;
    quantity: number | null;
};

const toNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const ymd = (d: Date): string => d.toISOString().split('T')[0];

const getMonthBounds = (month: number, year: number): { start: string; end: string } => {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start: ymd(start), end: ymd(end) };
};

const daysBetween = (fromDate: Date, toDate: Date): number => {
    const ms = toDate.getTime() - fromDate.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const buildInventorySnapshot = async () => {
    const [
        { data: products, error: productError },
        { data: purchases, error: purchaseError },
        { data: sales, error: salesError },
        { data: waste, error: wasteError }
    ] = await Promise.all([
        supabase.from('products').select('id, name, category, unit, cost_price, min_stock, expiry_date, track_expiry'),
        supabase.from('purchases').select('product_id, quantity'),
        supabase.from('sales').select('product_id, quantity'),
        supabase.from('waste').select('product_id, quantity')
    ]);

    if (productError || purchaseError || salesError || wasteError) {
        throw new Error(
            productError?.message ||
            purchaseError?.message ||
            salesError?.message ||
            wasteError?.message ||
            'Failed to build inventory snapshot'
        );
    }

    const purchasedByProduct = new Map<number, number>();
    const soldByProduct = new Map<number, number>();
    const wasteByProduct = new Map<number, number>();

    (purchases as MovementRow[] | null)?.forEach((row) => {
        purchasedByProduct.set(row.product_id, (purchasedByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    (sales as MovementRow[] | null)?.forEach((row) => {
        soldByProduct.set(row.product_id, (soldByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    (waste as MovementRow[] | null)?.forEach((row) => {
        wasteByProduct.set(row.product_id, (wasteByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });

    const today = new Date();

    return ((products || []) as ProductRow[]).map((product) => {
        const purchased = purchasedByProduct.get(product.id) || 0;
        const sold = soldByProduct.get(product.id) || 0;
        const wasted = wasteByProduct.get(product.id) || 0;
        const currentStock = purchased - sold - wasted;
        const costPrice = toNumber(product.cost_price);
        const minStock = toNumber(product.min_stock);
        const stockValue = currentStock * costPrice;

        let daysUntilExpiry: number | null = null;
        if (product.expiry_date) {
            daysUntilExpiry = daysBetween(today, new Date(product.expiry_date));
        }

        return {
            id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit || 'unit',
            current_stock: currentStock,
            min_stock: minStock,
            stock_value: stockValue,
            is_low_stock: currentStock <= minStock,
            expiry_date: product.expiry_date,
            days_until_expiry: daysUntilExpiry,
            track_expiry: Boolean(product.track_expiry)
        };
    });
};

const computeMonthlyRow = async (start: string, end: string) => {
    const [
        { data: sales, error: salesError },
        { data: purchases, error: purchaseError },
        { data: expenses, error: expenseError },
        { data: waste, error: wasteError }
    ] = await Promise.all([
        supabase.from('sales').select('total').gte('sale_date', start).lt('sale_date', end),
        supabase.from('purchases').select('total').gte('purchase_date', start).lt('purchase_date', end),
        supabase.from('expenses').select('amount').gte('expense_date', start).lt('expense_date', end),
        supabase.from('waste').select('cost_value').gte('waste_date', start).lt('waste_date', end)
    ]);

    if (salesError || purchaseError || expenseError || wasteError) {
        throw new Error(
            salesError?.message ||
            purchaseError?.message ||
            expenseError?.message ||
            wasteError?.message ||
            'Failed to compute monthly report'
        );
    }

    const totalSales = (sales || []).reduce((sum, row) => sum + toNumber((row as { total?: number }).total), 0);
    const totalPurchases = (purchases || []).reduce((sum, row) => sum + toNumber((row as { total?: number }).total), 0);
    const totalExpenses = (expenses || []).reduce((sum, row) => sum + toNumber((row as { amount?: number }).amount), 0);
    const totalWaste = (waste || []).reduce((sum, row) => sum + toNumber((row as { cost_value?: number }).cost_value), 0);

    return {
        month: start,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_waste: totalWaste,
        profit: totalSales - totalPurchases - totalExpenses - totalWaste
    };
};

// Dashboard endpoint - comprehensive dashboard data
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const targetDate = new Date().toISOString().split('T')[0];

        // Run all queries in parallel for performance
        const [
            { data: sales, error: salesError },
            { data: purchases, error: purchasesError },
            { data: expenses, error: expensesError },
            { data: waste, error: wasteError },
            { data: allSales, error: allSalesError },
            { data: products, error: productsError },
            inventorySnapshot
        ] = await Promise.all([
            supabase.from('sales').select('total').eq('sale_date', targetDate),
            supabase.from('purchases').select('total').eq('purchase_date', targetDate),
            supabase.from('expenses').select('amount').eq('expense_date', targetDate),
            supabase.from('waste').select('cost_value').eq('waste_date', targetDate),
            supabase.from('sales').select('product_id, quantity'),
            supabase.from('products').select('id, name'),
            buildInventorySnapshot()
        ]);

        if (salesError || purchasesError || expensesError || wasteError || allSalesError || productsError) {
            return res.status(400).json({ error: 'Error fetching dashboard data' });
        }

        const totalSales = sales?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
        const totalPurchases = purchases?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
        const totalExpenses = expenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
        const totalWaste = waste?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;
        const totalStockValue = inventorySnapshot.reduce((acc, curr) => acc + toNumber(curr.stock_value), 0);

        const lowStockCount = inventorySnapshot.filter((item) => item.is_low_stock).length;
        const expiringCount = inventorySnapshot.filter(
            (item) => item.track_expiry && item.days_until_expiry !== null && item.days_until_expiry >= 0 && item.days_until_expiry <= 7
        ).length;

        const salesQtyByProduct = new Map<number, number>();
        (allSales || []).forEach((row) => {
            const productId = (row as { product_id: number }).product_id;
            const quantity = toNumber((row as { quantity?: number }).quantity);
            salesQtyByProduct.set(productId, (salesQtyByProduct.get(productId) || 0) + quantity);
        });
        const productNameById = new Map<number, string>();
        (products || []).forEach((p) => {
            productNameById.set((p as { id: number }).id, (p as { name: string }).name);
        });
        const topSelling = [...salesQtyByProduct.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([product_id, total_quantity]) => ({
                product_id,
                product_name: productNameById.get(product_id) || `Product ${product_id}`,
                total_quantity
            }));

        res.json({
            today: {
                total_sales: totalSales,
                total_purchases: totalPurchases,
                total_expenses: totalExpenses,
                total_waste: totalWaste,
                net: totalSales - totalPurchases - totalExpenses - totalWaste
            },
            total_stock_value: totalStockValue,
            low_stock_count: lowStockCount,
            expiring_count: expiringCount,
            top_selling_products: topSelling
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unexpected dashboard error';
        res.status(500).json({ error: message });
    }
});

// Daily report
router.get('/daily', requireAuth, async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total')
        .eq('sale_date', targetDate);

    const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('total')
        .eq('purchase_date', targetDate);

    const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', targetDate);

    const { data: waste, error: wasteError } = await supabase
        .from('waste')
        .select('cost_value')
        .eq('waste_date', targetDate);

    if (salesError || purchasesError || expensesError || wasteError) {
        return res.status(400).json({ error: 'Error fetching report data' });
    }

    const totalSales = sales?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
    const totalPurchases = purchases?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
    const totalWaste = waste?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;

    res.json({
        date: targetDate,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_waste: totalWaste,
        profit: totalSales - totalPurchases - totalExpenses - totalWaste,
        net: totalSales - totalPurchases - totalExpenses - totalWaste
    });
});

// Detailed Daily Report for CSV
router.get('/daily/details', requireAuth, async (req, res) => {
    const { date } = req.query;
    const targetDate = date ? (date as string) : new Date().toISOString().split('T')[0];

    try {
        // 1. Fetch all products
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, cost_price, price');

        if (prodError) throw prodError;

        // 2. Fetch past transactions (before targetDate) for Opening Stock
        // We need to sum quantities by product_id
        const { data: pastPurchases } = await supabase
            .from('purchases')
            .select('product_id, quantity')
            .lt('purchase_date', targetDate);

        const { data: pastSales } = await supabase
            .from('sales')
            .select('product_id, quantity')
            .lt('sale_date', targetDate);

        const { data: pastWaste } = await supabase
            .from('waste')
            .select('product_id, quantity')
            .lt('waste_date', targetDate);

        // 3. Fetch today's transactions (on targetDate)
        const { data: todayPurchases } = await supabase
            .from('purchases')
            .select('product_id, quantity, total')
            .eq('purchase_date', targetDate);

        const { data: todaySales } = await supabase
            .from('sales')
            .select('product_id, quantity, total')
            .eq('sale_date', targetDate);

        const { data: todayWaste } = await supabase
            .from('waste')
            .select('product_id, quantity')
            .eq('waste_date', targetDate);

        // 4. Fetch today's expenses (global)
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('expense_date', targetDate);

        const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

        // Helper to sum by product
        const sumByProduct = (items: any[], prodId: number, field: string = 'quantity') =>
            items?.filter(i => i.product_id === prodId).reduce((acc, curr) => acc + (curr[field] || 0), 0) || 0;

        // 5. Build Report Data
        const reportData = products?.map(product => {
            // Opening Stock Calculation
            const pastPurchasedQty = sumByProduct(pastPurchases || [], product.id);
            const pastSoldQty = sumByProduct(pastSales || [], product.id);
            const pastWastedQty = sumByProduct(pastWaste || [], product.id);
            const openingStock = pastPurchasedQty - pastSoldQty - pastWastedQty;

            // Today's Activity
            const purchasedQty = sumByProduct(todayPurchases || [], product.id);
            const soldQty = sumByProduct(todaySales || [], product.id);
            const wastedQty = sumByProduct(todayWaste || [], product.id); // Needed for closing stock

            // Closing Stock
            const closingStock = openingStock + purchasedQty - soldQty - wastedQty;

            // Values
            const purchaseValue = sumByProduct(todayPurchases || [], product.id, 'total');
            const salesValue = sumByProduct(todaySales || [], product.id, 'total');

            // Gross Profit: Sales Value - (Sold Qty * Cost Price)
            // Note: Using current cost price. Ideally should use FIFO/LIFO but that's complex.
            const costOfGoodsSold = soldQty * product.cost_price;
            const grossProfit = salesValue - costOfGoodsSold;

            return {
                date: targetDate,
                product_name: product.name,
                opening_stock: openingStock,
                purchases_qty: purchasedQty,
                sales_qty: soldQty,
                closing_stock: closingStock,
                total_purchase_value: purchaseValue,
                total_sales_value: salesValue,
                gross_profit: grossProfit,
                notes: ''
            };
        });

        res.json({
            records: reportData,
            totals: {
                total_purchase_value: reportData?.reduce((sum, r) => sum + r.total_purchase_value, 0) || 0,
                total_sales_value: reportData?.reduce((sum, r) => sum + r.total_sales_value, 0) || 0,
                total_gross_profit: reportData?.reduce((sum, r) => sum + r.gross_profit, 0) || 0,
                total_expenses: totalExpenses,
                net_profit: (reportData?.reduce((sum, r) => sum + r.gross_profit, 0) || 0) - totalExpenses
            }
        });

    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Monthly report
router.get('/monthly', requireAuth, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (month && year) {
            const monthNum = parseInt(month as string, 10);
            const yearNum = parseInt(year as string, 10);
            const { start, end } = getMonthBounds(monthNum, yearNum);
            const row = await computeMonthlyRow(start, end);
            return res.json([row]);
        }

        const { data: months, error: monthError } = await supabase
            .from('calendar_months')
            .select('month_start')
            .order('month_start', { ascending: false })
            .limit(12);

        let monthStarts: string[] = [];
        if (!monthError && months && months.length > 0) {
            monthStarts = months.map((m) => (m as { month_start: string }).month_start);
        } else {
            const now = new Date();
            for (let i = 0; i < 12; i += 1) {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
                monthStarts.push(ymd(d));
            }
        }

        const rows = await Promise.all(
            monthStarts.map(async (monthStart) => {
                const d = new Date(monthStart);
                const { start, end } = getMonthBounds(d.getUTCMonth() + 1, d.getUTCFullYear());
                return computeMonthlyRow(start, end);
            })
        );

        return res.json(rows);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error fetching monthly report';
        return res.status(500).json({ error: message });
    }
});

// Inventory report with pagination, search, and sort
router.get('/inventory', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;
        const term = String(search).toLowerCase().trim();
        const ascending = sortOrder === 'asc';

        let snapshot = await buildInventorySnapshot();
        if (term) {
            snapshot = snapshot.filter((item) =>
                item.name.toLowerCase().includes(term) ||
                (item.category || '').toLowerCase().includes(term)
            );
        }

        const sortKey = String(sortBy);
        snapshot.sort((a, b) => {
            const av = (a as Record<string, unknown>)[sortKey];
            const bv = (b as Record<string, unknown>)[sortKey];
            if (typeof av === 'number' && typeof bv === 'number') {
                return ascending ? av - bv : bv - av;
            }
            const as = String(av ?? '').toLowerCase();
            const bs = String(bv ?? '').toLowerCase();
            if (as < bs) return ascending ? -1 : 1;
            if (as > bs) return ascending ? 1 : -1;
            return 0;
        });

        const paginated = snapshot.slice(offset, offset + limitNum);

        res.json({
            data: paginated,
            count: snapshot.length,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(snapshot.length / limitNum)
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error fetching inventory report';
        res.status(500).json({ error: message });
    }
});

// Expiring items
router.get('/expiring', requireAuth, async (req, res) => {
    try {
        const { days } = req.query;
        const daysAhead = days ? parseInt(days as string, 10) : 7;
        const snapshot = await buildInventorySnapshot();
        const data = snapshot.filter(
            (item) =>
                item.track_expiry &&
                item.days_until_expiry !== null &&
                item.days_until_expiry >= 0 &&
                item.days_until_expiry <= daysAhead
        );
        res.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error fetching expiring items';
        res.status(500).json({ error: message });
    }
});

// Low stock items
router.get('/low-stock', requireAuth, async (req, res) => {
    try {
        const snapshot = await buildInventorySnapshot();
        const data = snapshot.filter((item) => item.is_low_stock);
        res.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error fetching low stock items';
        res.status(500).json({ error: message });
    }
});

// Top selling products
router.get('/top-selling', requireAuth, async (req, res) => {
    try {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit as string, 10) : 10;
        const [{ data: sales, error: salesError }, { data: products, error: productError }] = await Promise.all([
            supabase.from('sales').select('product_id, quantity'),
            supabase.from('products').select('id, name')
        ]);

        if (salesError || productError) {
            return res.status(400).json({ error: salesError?.message || productError?.message || 'Error fetching top-selling data' });
        }

        const qtyByProduct = new Map<number, number>();
        (sales || []).forEach((row) => {
            const productId = (row as { product_id: number }).product_id;
            const quantity = toNumber((row as { quantity?: number }).quantity);
            qtyByProduct.set(productId, (qtyByProduct.get(productId) || 0) + quantity);
        });
        const productNameById = new Map<number, string>();
        (products || []).forEach((p) => {
            productNameById.set((p as { id: number }).id, (p as { name: string }).name);
        });

        const data = [...qtyByProduct.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limitNum)
            .map(([product_id, total_quantity]) => ({
                product_id,
                product_name: productNameById.get(product_id) || `Product ${product_id}`,
                total_quantity
            }));

        res.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error fetching top-selling products';
        res.status(500).json({ error: message });
    }
});

// Waste report
router.get('/waste', requireAuth, async (req, res) => {
    const { start_date, end_date } = req.query;

    let query = supabase
        .from('waste')
        .select(`
            *,
            products (
                name,
                category
            )
        `)
        .order('waste_date', { ascending: false });

    if (start_date) query = query.gte('waste_date', start_date);
    if (end_date) query = query.lte('waste_date', end_date);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    // Calculate totals
    const totalWaste = data?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;
    const totalQuantity = data?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

    res.json({
        records: data,
        summary: {
            total_waste_value: totalWaste,
            total_quantity: totalQuantity,
            record_count: data?.length || 0
        }
    });
});

export default router;
