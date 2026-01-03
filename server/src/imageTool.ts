
import { supabase } from './supabase';

export async function updateStockFromImage(productName: string, quantity: number) {
    console.log(`[Tool] Updating stock for '${productName}' by ${quantity}...`);

    // 1. Find the product ID by name (Case-insensitive search)
    const { data: products, error: searchError } = await supabase
        .from('products')
        .select('id, name, cost_price')
        .ilike('name', `%${productName}%`)
        .limit(1);

    if (searchError) {
        throw new Error(`Error searching for product: ${searchError.message}`);
    }

    if (!products || products.length === 0) {
        return {
            status: "error",
            message: `Product '${productName}' not found. Please create it first.`
        };
    }

    const product = products[0];
    const costPrice = product.cost_price || 0;

    // 2. Add entry to 'purchases' table (Assuming 'IN' / Restock)
    const { error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
            product_id: product.id,
            quantity: quantity,
            price: costPrice,
            purchase_date: new Date().toISOString().split('T')[0]
        }]);

    if (purchaseError) {
        throw new Error(`Error inserting purchase: ${purchaseError.message}`);
    }

    // 3. Log the update (Optional but good for history)
    // We try to log but don't fail the whole operation if it fails
    await supabase.from('stock_logs').insert([{
        product_id: product.id,
        quantity: quantity,
        action_type: 'IN',
        updated_by: 'mcp-agent', // Differentiate source
        notes: `Auto-update via MCP Tool for '${productName}'`
    }]);

    return {
        status: "success",
        product: product.name,
        added_quantity: quantity,
        message: `Successfully added ${quantity} to ${product.name}`
    };
}
