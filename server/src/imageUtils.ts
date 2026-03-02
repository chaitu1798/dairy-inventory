import { collections } from './firebase';
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
    try {
        const productsSnapshot = await collections.products
            .where('name', '>=', productName)
            .limit(10) // Search heuristic
            .get();

        const products = productsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() as any }))
            .filter(p => p.name.toLowerCase().includes(productName.toLowerCase()));

        if (products.length === 0) {
            return {
                status: "error",
                message: `Product '${productName}' not found. Please create it first.`
            };
        }

        const product = products[0];
        const costPrice = product.cost_price || 0;

        const newPurchase = {
            product_id: product.id,
            quantity: quantity,
            price: costPrice,
            total: quantity * costPrice,
            purchase_date: new Date().toISOString().split('T')[0]
        };

        await collections.purchases.add(newPurchase);

        await collections.stock_logs.add({
            product_id: product.id,
            quantity: quantity,
            action_type: 'IN',
            updated_by: 'system-agent',
            notes: `Auto-update via consolidated image tool for '${productName}'`,
            created_at: new Date().toISOString()
        });

        return {
            status: "success",
            product: product.name,
            added_quantity: quantity,
            message: `Successfully added ${quantity} to ${product.name}`
        };
    } catch (error: any) {
        throw new Error(`Error updating stock: ${error.message}`);
    }
}
