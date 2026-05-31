export interface Category {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

export interface Product {
    id: string | number;
    productName: string;
    category: string;
    costPrice: number;
    counterPrice: number;
    distributionPrice: number;
    stock: number;
    thresholdLimit: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;

    // Legacy fields for compatibility
    name?: string;
    categoryId?: string;
    categoryName?: string;
    unit?: string;
    price?: number;
    distribution_price?: number;
    cost_price?: number;
    min_stock?: number;
    low_stock_threshold?: number;
    stock_quantity?: number;
    is_low_stock?: boolean;
}

export interface Customer {
    id: string | number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    balance: number;
    credit_limit?: number;
    created_at: string;
}

export interface Sale {
    id: string | number;
    invoice_number: string;
    product_id: string | number;
    customer_id: string | number | null;
    quantity: number;
    price: number;
    total: number;
    sale_date: string;
    sale_type?: 'counter' | 'distribution';
    status: 'paid' | 'pending' | 'overdue';
    due_date: string | null;
    amount_paid: number;
    created_at: string;
    products?: { name: string; unit: string };
    customers?: { name: string };
}

export interface Purchase {
    id: string | number;
    product_id: string | number;
    quantity: number;
    price: number;
    total: number;
    purchase_date: string;
    expiry_date: string | null;
    created_at: string;
    products?: { name: string; unit: string };
}

export interface Expense {
    id: string | number;
    category: string;
    amount: number;
    notes: string | null;
    expense_date: string;
    created_at: string;
}

export interface Payment {
    id: string | number;
    sale_id: string | number;
    amount: number;
    payment_date: string;
    payment_method: string | null;
    notes: string | null;
    created_at: string;
}

export interface Waste {
    id: string | number;
    product_id: string | number;
    quantity: number;
    reason: 'expired' | 'damaged' | 'other';
    cost_value: number;
    waste_date: string;
    notes: string | null;
    created_at: string;
    products?: { id: string | number; name: string; category: string; unit: string };
}

export interface DashboardStats {
    today: {
        total_sales: number;
        total_purchases: number;
        total_expenses: number;
        total_waste: number;
        net: number;
    };
    total_stock_value: number;
    low_stock_count: number;
    expiring_count: number;
    top_selling_products: Array<{
        id?: string | number;
        product_id: string | number;
        name: string;
        category?: string;
        total_quantity_sold?: number;
        total_revenue?: number;
    }>;
}