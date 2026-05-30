import { collections } from './firebase';
import multer from 'multer';

// 1. Multer Upload Configuration
const storage = multer.memoryStorage();
export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 2. Image Analysis
interface ExtractedProduct {
    name: string;
    category: string; // Raw category name from photo
    distributionPrice: number;
    counterPrice: number;
}

interface AnalysisResult {
    products: ExtractedProduct[];
    confidence: number;
}

// Helper to map raw category to our categoryId and categoryName
function mapCategory(rawCategory: string): { categoryId: string; categoryName: string } {
    const categoryLower = rawCategory.toLowerCase();
    if (categoryLower.includes('milk') || categoryLower.includes('lassi')) {
        return { categoryId: 'milk', categoryName: 'Milk' };
    }
    if (categoryLower.includes('curd') || categoryLower.includes('paneer')) {
        return { categoryId: 'curd', categoryName: 'Curd' };
    }
    if (categoryLower.includes('ghee')) {
        return { categoryId: 'ghee', categoryName: 'Ghee' };
    }
    if (categoryLower.includes('bread') || categoryLower.includes('cake') || categoryLower.includes('biscuit')) {
        return { categoryId: 'breads', categoryName: 'Breads' };
    }
    if (categoryLower.includes('sweet')) {
        return { categoryId: 'sweets', categoryName: 'Sweets' };
    }
    return { categoryId: 'products', categoryName: 'General Product' };
}

export async function analyzeImage(fileBuffer: Buffer): Promise<AnalysisResult> {
    // Mock delay to simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock data based on user's photo
    const extractedProducts: ExtractedProduct[] = [
        { name: "ganga500", category: "Milk Products", distributionPrice: 27.5, counterPrice: 29 },
        { name: "dtn200", category: "Milk Products", distributionPrice: 12.35, counterPrice: 68 },
        { name: "cooling", category: "Milk Products", distributionPrice: 10, counterPrice: 11 },
        { name: "butter milk", category: "Milk Products", distributionPrice: 7, counterPrice: 8 },
        { name: "slim", category: "Milk Products", distributionPrice: 23, counterPrice: 30 },
        { name: "ganga500 box", category: "Milk Products", distributionPrice: 9, counterPrice: 10 },
        { name: "lassi mango", category: "Lassi Items", distributionPrice: 11.5, counterPrice: 13 },
        { name: "lassi", category: "Lassi Items", distributionPrice: 8.75, counterPrice: 10 },
        { name: "curd500", category: "Curd & Paneer", distributionPrice: 13.5, counterPrice: 15 },
        { name: "curd200", category: "Curd & Paneer", distributionPrice: 7, counterPrice: 8 },
        { name: "curd", category: "Curd & Paneer", distributionPrice: 8, counterPrice: 10 },
        { name: "170 cups", category: "Curd & Paneer", distributionPrice: 8.15, counterPrice: 9 },
        { name: "1 lite tub", category: "Curd & Paneer", distributionPrice: 145, counterPrice: 165 },
        { name: "20 lite tub", category: "Curd & Paneer", distributionPrice: 95, counterPrice: 105 },
        { name: "5 lite tub", category: "Curd & Paneer", distributionPrice: 370, counterPrice: 405 },
        { name: "paneer500", category: "Curd & Paneer", distributionPrice: 80, counterPrice: 85 },
        { name: "cow ghee 200", category: "Ghee", distributionPrice: 635, counterPrice: 710 },
        { name: "ghee500", category: "Ghee", distributionPrice: 1350, counterPrice: 1450 },
        { name: "200 bred", category: "Bread Cakes & Biscuits", distributionPrice: 27, counterPrice: 30 },
        { name: "bread", category: "Bread Cakes & Biscuits", distributionPrice: 8.5, counterPrice: 10 },
        { name: "cake", category: "Bread Cakes & Biscuits", distributionPrice: 17, counterPrice: 20 },
        { name: "osmania20", category: "Bread Cakes & Biscuits", distributionPrice: 32, counterPrice: 35 },
        { name: "osmania40", category: "Bread Cakes & Biscuits", distributionPrice: 54, counterPrice: 60 },
        { name: "osmania120", category: "Bread Cakes & Biscuits", distributionPrice: 110, counterPrice: 120 },
        { name: "junnu", category: "Sweets", distributionPrice: 18, counterPrice: 16 },
        { name: "peda200", category: "Sweets", distributionPrice: 13, counterPrice: 15 },
        { name: "boddi per", category: "Sweets", distributionPrice: 250, counterPrice: 310 },
        { name: "kakinada", category: "Sweets", distributionPrice: 160, counterPrice: 180 },
        { name: "mysorepak", category: "Savory Snacks & Others", distributionPrice: 85, counterPrice: 95 },
        { name: "khunnu 200", category: "Savory Snacks & Others", distributionPrice: 150, counterPrice: 170 },
        { name: "zingo", category: "Savory Snacks & Others", distributionPrice: 11.5, counterPrice: 13 },
        { name: "mango chogodu", category: "Savory Snacks & Others", distributionPrice: 23, counterPrice: 25 },
        { name: "special muruku", category: "Savory Snacks & Others", distributionPrice: 55, counterPrice: 60 },
        { name: "panch mukulu", category: "Savory Snacks & Others", distributionPrice: 65, counterPrice: 70 },
        { name: "kaju mix 400", category: "Savory Snacks & Others", distributionPrice: 130, counterPrice: 145 },
        { name: "moong dal 200", category: "Savory Snacks & Others", distributionPrice: 55, counterPrice: 60 },
        { name: "dadar 400", category: "Savory Snacks & Others", distributionPrice: 60, counterPrice: 65 },
    ];
    return {
        products: extractedProducts,
        confidence: 0.98
    };
}

// 3. Bulk Product Creation Tool
export async function createProductsFromImage(products: ExtractedProduct[]) {
    const createdProducts: any[] = [];
    for (const extractedProduct of products) {
        const { categoryId, categoryName } = mapCategory(extractedProduct.category);
        // Calculate cost price as 90% of distribution price
        const costPrice = Math.round(extractedProduct.distributionPrice * 0.9 * 100) / 100;
        const newProduct = {
            name: extractedProduct.name,
            categoryId,
            categoryName,
            category: categoryId, // Keep for backward compatibility
            unit: "packets", // Standardized unit as per user request
            price: extractedProduct.counterPrice,
            distribution_price: extractedProduct.distributionPrice,
            cost_price: costPrice,
            min_stock: 5, // Standardized low stock threshold as per user request
            track_expiry: false,
            expiry_date: null,
            created_at: new Date().toISOString()
        };
        const docRef = await collections.products.add(newProduct);
        const doc = await docRef.get();
        createdProducts.push({ id: doc.id, ...doc.data() });
    }
    return {
        status: "success",
        createdProducts,
        message: `Successfully created ${createdProducts.length} products`
    };
}
