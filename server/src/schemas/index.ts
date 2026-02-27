import { z } from 'zod';

// Finance Payment
export const PaymentSchema = z.object({
    body: z.object({
        sale_id: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        amount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        payment_date: z.string().optional(),
        payment_method: z.string().optional(),
        notes: z.string().optional(),
    })
});

// Transactions: Purchases
export const PurchaseSchema = z.object({
    body: z.object({
        product_id: z.number(),
        quantity: z.number(),
        total: z.number(),
        purchase_date: z.string().optional(),
        supplier_details: z.string().optional(),
    })
});

// Transactions: Sales
export const SaleSchema = z.object({
    body: z.object({
        product_id: z.number(),
        customer_id: z.number().nullable().optional(),
        quantity: z.number(),
        total: z.number(),
        sale_date: z.string().optional(),
        payment_method: z.string(),
        amount_paid: z.number().default(0),
        status: z.enum(['paid', 'pending', 'overdue']).default('paid')
    })
});

// Transactions: Expenses
export const ExpenseSchema = z.object({
    body: z.object({
        category: z.string(),
        amount: z.number(),
        description: z.string().optional(),
        expense_date: z.string().optional()
    })
});

// Products
export const ProductSchema = z.object({
    body: z.object({
        name: z.string(),
        category: z.string(),
        cost_price: z.number(),
        price: z.number(),
        stock: z.number(),
        reorder_level: z.number().optional().default(10),
        days_to_expiry: z.number().optional().default(30)
    })
});

// Customers
export const CustomerSchema = z.object({
    body: z.object({
        name: z.string(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable(),
        address: z.string().optional().nullable(),
        balance: z.number().default(0)
    })
});

// Waste
export const WasteSchema = z.object({
    body: z.object({
        product_id: z.number(),
        quantity: z.number(),
        reason: z.string(),
        cost_value: z.number(),
        waste_date: z.string().optional()
    })
});
