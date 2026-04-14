import { z } from 'zod';

// Finance Payment
export const PaymentSchema = z.object({
    body: z.object({
        sale_id: z.union([z.string(), z.number()]).transform((val) => String(val)),
        amount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        payment_date: z.string().optional(),
        payment_method: z.string().optional(),
        notes: z.string().optional(),
    })
});

// Transactions: Purchases
export const PurchaseSchema = z.object({
    body: z.object({
        product_id: z.union([z.string(), z.number()]),
        quantity: z.number(),
        total: z.number().optional(),
        purchase_date: z.string().optional(),
        expiry_date: z.string().nullable().optional(),
        image_url: z.string().optional(),
        supplier_details: z.string().optional(),
    })
});

// Transactions: Sales
export const SaleSchema = z.object({
    body: z.object({
        product_id: z.union([z.string(), z.number()]),
        customer_id: z.union([z.string(), z.number()]).nullable().optional(),
        quantity: z.number(),
        sale_date: z.string().optional(),
        status: z.enum(['paid', 'pending', 'overdue']).optional(),
        due_date: z.string().nullable().optional(),
        // Support old fields for compatibility
        total: z.number().optional(),
        payment_method: z.string().optional(),
        amount_paid: z.number().optional()
    })
});

// Transactions: Expenses
export const ExpenseSchema = z.object({
    body: z.object({
        category: z.string().min(1, 'Category is required'),
        amount: z.number().min(0.01, 'Amount must be greater than 0'),
        description: z.string().optional(),
        notes: z.string().optional(),
        expense_date: z.string().optional()
    })
});

// Products
export const ProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Product name is required'),
        categoryId: z.string().min(1, 'Category ID is required'),
        categoryName: z.string().min(1, 'Category Name is required'),
        unit: z.string().min(1, 'Unit is required'),
        cost_price: z.number().optional(),
        price: z.number().optional(),
        stock: z.number().optional(),
        current_stock: z.number().optional(),
        low_stock_threshold: z.number().optional(),
        reorder_level: z.number().optional(),
        track_expiry: z.boolean().optional(),
        expiry_date: z.string().nullable().optional(),
        days_to_expiry: z.number().optional(),
        // Keep old fields for backward compatibility during migration
        type: z.string().optional(),
        category: z.string().optional()
    })
});

// Customers
export const CustomerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Customer name is required'),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        balance: z.number().optional(),
        credit_limit: z.number().optional()
    })
});

// Waste
export const WasteSchema = z.object({
    body: z.object({
        product_id: z.union([z.string(), z.number()]),
        quantity: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        reason: z.string(),
        cost_value: z.union([z.string(), z.number()]).transform((val) => Number(val)).optional(),
        waste_date: z.string().optional(),
        notes: z.string().optional()
    })
});
