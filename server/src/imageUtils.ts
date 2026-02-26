import { supabase } from './supabase';
import multer from 'multer';

// 1. Multer Upload Configuration
const storage = multer.memoryStorage();
export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 2. Image Analysis
interface AnalysisResult {
    product: string;
    quantity: number;
    confidence: number;
}

export async function analyzeImage(fileBuffer: Buffer): Promise<AnalysisResult> {
    // Mock delay to simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
        product: "Milk",
        quantity: 50,
        confidence: 0.98
    };
}

// 3. Stock Update Tool
export async function updateStockFromImage(productName: string, quantity: number) {

    const { data: products, error: searchError } = await supabase
        .from('products')
        .select('id, name, cost_price')
        .ilike('name', `%${productName}%`)
        .limit(1);

    if (searchError) throw new Error(`Error searching for product: ${searchError.message}`);

    if (!products || products.length === 0) {
        return {
            status: "error",
            message: `Product '${productName}' not found. Please create it first.`
        };
    }

    const product = products[0];
    const costPrice = product.cost_price || 0;

    const { error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
            product_id: product.id,
            quantity: quantity,
            price: costPrice,
            purchase_date: new Date().toISOString().split('T')[0]
        }]);

    if (purchaseError) throw new Error(`Error inserting purchase: ${purchaseError.message}`);

    await supabase.from('stock_logs').insert([{
        product_id: product.id,
        quantity: quantity,
        action_type: 'IN',
        updated_by: 'system-agent',
        notes: `Auto-update via consolidated image tool for '${productName}'`
    }]);

    return {
        status: "success",
        product: product.name,
        added_quantity: quantity,
        message: `Successfully added ${quantity} to ${product.name}`
    };
}
