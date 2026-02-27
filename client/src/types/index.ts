export interface Product {
    id: number;
    name: string;
    category?: string;
    type?: string;
    unit: string;
    price: number;
    cost_price?: number;
    min_stock?: number;
    track_expiry?: boolean;
    expiry_date?: string | null;
    expiry_days?: number;
    created_at?: string;
    current_stock?: number;
    stock_quantity?: number;
    stock_value?: number;
    is_low_stock?: boolean;
    days_until_expiry?: number;
}

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    balance: number;
    credit_limit?: number;
    created_at: string;
}

export interface Sale {
    id: number;
    invoice_number: string;
    product_id: number;
    customer_id: number | null;
    quantity: number;
    price: number;
    total: number;
    sale_date: string;
    status: 'paid' | 'pending' | 'overdue';
    due_date: string | null;
    amount_paid: number;
    created_at: string;
    products?: { name: string; unit: string };
    customers?: { name: string };
}

export interface Purchase {
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    total: number;
    purchase_date: string;
    expiry_date: string | null;
    created_at: string;
    products?: { name: string; unit: string };
}

export interface Expense {
    id: number;
    category: string;
    amount: number;
    notes: string | null;
    expense_date: string;
    created_at: string;
}

export interface Payment {
    id: number;
    sale_id: number;
    amount: number;
    payment_date: string;
    payment_method: string | null;
    notes: string | null;
    created_at: string;
}

export interface Waste {
    id: number;
    product_id: number;
    quantity: number;
    reason: 'expired' | 'damaged' | 'other';
    cost_value: number;
    waste_date: string;
    notes: string | null;
    created_at: string;
    products?: { id: number; name: string; category: string; unit: string };
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
        id?: number;
        product_id: number;
        name: string;
        category?: string;
        total_quantity_sold?: number;
        total_revenue?: number;
    }>;
}
