import { Router } from 'express';
import { collections, db } from '../firebase';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper to normalize string (trim, replace multiple spaces)
const normalizeString = (str: string) => {
    return str.trim().replace(/\s+/g, ' ');
};

// --- STEP 1: BACKUP EXISTING DATA ---
router.get('/backup', requireAuth, async (req, res) => {
    try {
        const [products, categories, inventory, stockHistory] = await Promise.all([
            collections.products.get(),
            collections.categories.get(),
            collections.inventory.get(),
            db.collection('stockHistory').get(),
        ]);

        const backup = {
            products: products.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            categories: categories.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            inventory: inventory.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            stockHistory: stockHistory.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            createdAt: new Date().toISOString()
        };

        res.json({ success: true, backup });
    } catch (error) {
        console.error('Backup failed:', error);
        res.status(500).json({ success: false, error: 'Failed to create backup' });
    }
});

// --- STEP 2: DELETE EXISTING MASTER DATA ---
const deleteCollection = async (collectionRef: FirebaseFirestore.CollectionReference) => {
    const snapshot = await collectionRef.get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
        return;
    }

    // Delete in batches of 500 (Firestore limit)
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count === 500) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
};

router.delete('/delete-data', requireAuth, async (req, res) => {
    try {
        await Promise.all([
            deleteCollection(collections.categories),
            deleteCollection(collections.products),
            deleteCollection(collections.inventory),
        ]);

        res.json({ success: true, message: 'Existing master data deleted successfully' });
    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ success: false, error: 'Failed to delete existing data' });
    }
});

// --- STEP 3 & 4: IMPORT NEW PRICE LIST ---
const priceListData = [
    { Category: 'Milk Products', 'Product Name': 'ganga500', 'Distribution Price': 27.5, 'Counter Price': 29 },
    { Category: 'Milk Products', 'Product Name': 'dtn200', 'Distribution Price': 12.35, 'Counter Price': 68 },
    { Category: 'Milk Products', 'Product Name': 'cooling', 'Distribution Price': 10, 'Counter Price': 11 },
    { Category: 'Milk Products', 'Product Name': 'butter milk', 'Distribution Price': 7, 'Counter Price': 8 },
    { Category: 'Milk Products', 'Product Name': 'slim', 'Distribution Price': 23, 'Counter Price': 30 },
    { Category: 'Milk Products', 'Product Name': 'ganga500 box', 'Distribution Price': 9, 'Counter Price': 10 },
    { Category: 'Lassi Items', 'Product Name': 'lassi mango', 'Distribution Price': 11.5, 'Counter Price': 13 },
    { Category: 'Lassi Items', 'Product Name': 'lassi', 'Distribution Price': 8.75, 'Counter Price': 10 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd500', 'Distribution Price': 13.5, 'Counter Price': 15 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd200', 'Distribution Price': 7, 'Counter Price': 8 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd', 'Distribution Price': 8, 'Counter Price': 10 },
    { Category: 'Curd & Paneer', 'Product Name': '170 cups', 'Distribution Price': 8.15, 'Counter Price': 9 },
    { Category: 'Curd & Paneer', 'Product Name': '1 lite tub', 'Distribution Price': 145, 'Counter Price': 165 },
    { Category: 'Curd & Paneer', 'Product Name': '20 lite tub', 'Distribution Price': 95, 'Counter Price': 105 },
    { Category: 'Curd & Paneer', 'Product Name': '5 lite tub', 'Distribution Price': 370, 'Counter Price': 405 },
    { Category: 'Curd & Paneer', 'Product Name': 'paneer500', 'Distribution Price': 80, 'Counter Price': 85 },
    { Category: 'Ghee', 'Product Name': 'cow ghee 200', 'Distribution Price': 635, 'Counter Price': 710 },
    { Category: 'Ghee', 'Product Name': 'ghee500', 'Distribution Price': 1350, 'Counter Price': 1450 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': '200 bred', 'Distribution Price': 27, 'Counter Price': 30 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'bread', 'Distribution Price': 8.5, 'Counter Price': 10 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'cake', 'Distribution Price': 17, 'Counter Price': 20 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmania20', 'Distribution Price': 32, 'Counter Price': 35 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmania40', 'Distribution Price': 54, 'Counter Price': 60 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmania120', 'Distribution Price': 110, 'Counter Price': 120 },
    { Category: 'Sweets', 'Product Name': 'junnu', 'Distribution Price': 18, 'Counter Price': 16 },
    { Category: 'Sweets', 'Product Name': 'peda200', 'Distribution Price': 13, 'Counter Price': 15 },
    { Category: 'Sweets', 'Product Name': 'boddi per', 'Distribution Price': 250, 'Counter Price': 310 },
    { Category: 'Sweets', 'Product Name': 'kakinada', 'Distribution Price': 160, 'Counter Price': 180 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'mysorepak', 'Distribution Price': 85, 'Counter Price': 95 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'khunnu 200', 'Distribution Price': 150, 'Counter Price': 170 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'zingo', 'Distribution Price': 11.5, 'Counter Price': 13 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'mango chogodu', 'Distribution Price': 23, 'Counter Price': 25 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'special muruku', 'Distribution Price': 55, 'Counter Price': 60 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'panch mukulu', 'Distribution Price': 65, 'Counter Price': 70 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'kaju mix 400', 'Distribution Price': 130, 'Counter Price': 145 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'moong dal 200', 'Distribution Price': 55, 'Counter Price': 60 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'dadar 400', 'Distribution Price': 60, 'Counter Price': 65 },
];

router.post('/import-pricelist', requireAuth, async (req, res) => {
    try {
        const batch = db.batch();
        const existingProductKeys = new Set<string>();
        const categoryIdMap = new Map<string, string>(); // Maps category name to Firestore ID

        // Create categories
        const uniqueCategories = [...new Set(priceListData.map(item => item.Category))];
        for (const categoryName of uniqueCategories) {
            const normalizedName = normalizeString(categoryName);
            
            // Check if category already exists in database
            const existingSnapshot = await collections.categories
                .where('name', '==', normalizedName)
                .get();
            
            let categoryDoc;
            if (existingSnapshot.empty) {
                // Create new category if not exists
                categoryDoc = collections.categories.doc();
                batch.set(categoryDoc, {
                    name: normalizedName,
                    isActive: true,
                    createdAt: new Date().toISOString()
                });
                categoryIdMap.set(normalizedName, categoryDoc.id);
            } else {
                // Use existing category
                categoryDoc = existingSnapshot.docs[0];
                categoryIdMap.set(normalizedName, categoryDoc.id);
            }
        }

        // Create products
        for (const item of priceListData) {
            const productName = normalizeString(item['Product Name']);
            const categoryName = normalizeString(item.Category);
            const categoryId = categoryIdMap.get(categoryName)!;
            const productKey = `${categoryName}-${productName}`;

            if (existingProductKeys.has(productKey)) {
                continue; // Skip duplicates
            }
            existingProductKeys.add(productKey);

            const counterPrice = Number(item['Counter Price']);
            const distributionPrice = Number(item['Distribution Price']);

            const productDoc = collections.products.doc();
            batch.set(productDoc, {
                productName,
                category: categoryName,
                categoryId: categoryId,
                costPrice: counterPrice,
                counterPrice,
                distributionPrice,
                stock: 0,
                thresholdLimit: 5,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Legacy fields for compatibility
                name: productName,
                categoryName: categoryName,
                unit: 'packets',
                price: counterPrice,
                distribution_price: distributionPrice,
                cost_price: counterPrice,
                min_stock: 5,
                low_stock_threshold: 5,
                stock_quantity: 0,
                is_low_stock: true // since stock is 0
            });
        }

        await batch.commit();

        res.json({
            success: true,
            message: 'Import completed successfully',
            categoriesImported: uniqueCategories.length,
            productsImported: existingProductKeys.size,
            thresholdApplied: 5,
            costPriceUpdated: 'Counter Price',
            oldDataRemoved: true
        });
    } catch (error) {
        console.error('Import failed:', error);
        res.status(500).json({ success: false, error: 'Failed to import price list' });
    }
});

// Get preview (returns sample price list data)
router.get('/preview', requireAuth, async (req, res) => {
    const uniqueCategories = [...new Set(priceListData.map(item => item.Category))];
    res.json({
        success: true,
        data: priceListData,
        totalCategories: uniqueCategories.length,
        totalProducts: priceListData.length
    });
});

export default router;