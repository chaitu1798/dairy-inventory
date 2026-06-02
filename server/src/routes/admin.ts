import { Router } from 'express';
import { collections, db } from '../firebase';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import * as XLSX from 'xlsx';

const NAME_TO_SLUG: Record<string, string> = {
    'Milk Products': 'milk-products',
    'Lassi Items': 'lassi-items',
    'Curd & Paneer': 'curd-paneer',
    'Ghee': 'ghee',
    'Breads Cakes & Biscuits': 'breads-cakes-biscuits',
    'Sweets': 'sweets',
    'Savory Snacks & Others': 'savory-snacks-others'
};

const purchaseData = [
  { name: 'ganga500', quantity: 192 },
  { name: 'ganga200', quantity: 136 },
  { name: 'dtm200', quantity: 63 },
  { name: 'cooling', quantity: 0 },
  { name: 'colli', quantity: 12 },
  { name: 'butter milk', quantity: 660 },
  { name: 'curd 80', quantity: 0 },
  { name: 'curd 180', quantity: 90 },
  { name: 'curd 425', quantity: 312 },
  { name: 'curd liter', quantity: 101 },
  { name: 'curd dtm', quantity: 519 },
  { name: '100 cups', quantity: 41 },
  { name: '170 cups', quantity: 0 },
  { name: '400 cup', quantity: 1 },
  { name: '1 litre tub', quantity: 6 },
  { name: '20 liter tub', quantity: 0 },
  { name: '10 liter tub', quantity: 0 },
  { name: '5 liter tub', quantity: 0 },
  { name: 'paneer', quantity: 5 },
  { name: 'paneer 500', quantity: 2 },
  { name: 'paneer 200', quantity: 4 },
  { name: 'cow gee kg', quantity: 2 },
  { name: 'cowgee 500', quantity: 1 },
  { name: 'cow gee200', quantity: 6 },
  { name: 'gee 500', quantity: 0 },
  { name: 'lassi', quantity: 0 },
  { name: 'mango lassi', quantity: 0 },
  { name: 'lassi', quantity: 164 },
  { name: 'junnu', quantity: 16 },
  { name: 'misthidoi', quantity: 0 },
  { name: 'buns', quantity: 30 },
  { name: '400 bred', quantity: 1 },
  { name: '200 bred', quantity: 11 },
  { name: 'cup cake', quantity: 3 },
  { name: 'palem cake', quantity: 0 },
  { name: 'rusk', quantity: 2 },
  { name: 'osmaniya 20', quantity: 1 },
  { name: 'osmaniya 40', quantity: 2 },
  { name: 'osmaniya 60', quantity: 0 },
  { name: 'osmaniya 120', quantity: 1 },
  { name: 'dood ped20', quantity: 50 },
  { name: 'bodam barfi', quantity: 0 },
  { name: 'dood peda 250', quantity: 2 },
  { name: 'khalakand', quantity: 0 },
  { name: 'milkcace 500', quantity: 0 },
  { name: 'myshorpac', quantity: 0 },
  { name: 'nuvvulu 200', quantity: 0 },
  { name: 'bodam milk', quantity: 165 },
  { name: 'lemon', quantity: 40 },
  { name: 'manga', quantity: 78 },
  { name: 'zero', quantity: 74 },
  { name: 'milk shake', quantity: 114 },
  { name: 'spaicy chogodi', quantity: 0 },
  { name: 'spaicy chogodi', quantity: 4 },
  { name: 'ribbon pakodi', quantity: 0 },
  { name: 'ribbon pakodi', quantity: 1 },
  { name: 'jonna murukulu', quantity: 1 },
  { name: 'jonna murukulu', quantity: 0 },
  { name: 'kaju mixer 400', quantity: 0 },
  { name: 'kaju mixer200', quantity: 6 },
  { name: 'moong dal 400', quantity: 2 },
  { name: 'moong dal 200', quantity: 5 },
  { name: 'cron flakes', quantity: 3 },
  { name: 'ganga 500 box', quantity: 0 },
  { name: 'slim', quantity: 0 },
];

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
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
    { Category: 'Milk Products', 'Product Name': 'ganga200', 'Distribution Price': 12.5, 'Counter Price': 13 },
    { Category: 'Milk Products', 'Product Name': 'dtm200', 'Distribution Price': 10.35, 'Counter Price': 11 },
    { Category: 'Milk Products', 'Product Name': 'colling', 'Distribution Price': 64, 'Counter Price': 68 },
    { Category: 'Milk Products', 'Product Name': 'colli', 'Distribution Price': 32, 'Counter Price': 34 },
    { Category: 'Milk Products', 'Product Name': 'butter milk', 'Distribution Price': 7, 'Counter Price': 8 },
    { Category: 'Milk Products', 'Product Name': 'bodam milk', 'Distribution Price': 25, 'Counter Price': 30 },
    { Category: 'Milk Products', 'Product Name': 'milk shake', 'Distribution Price': 23, 'Counter Price': 25 },
    { Category: 'Milk Products', 'Product Name': 'slim', 'Distribution Price': 9, 'Counter Price': 10 },
    { Category: 'Milk Products', 'Product Name': 'ganga 500 box', 'Distribution Price': 28, 'Counter Price': 30 },
    { Category: 'Lassi Items', 'Product Name': 'lassi', 'Distribution Price': 11.5, 'Counter Price': 13 },
    { Category: 'Lassi Items', 'Product Name': 'mango lassi', 'Distribution Price': 8.5, 'Counter Price': 10 },
    { Category: 'Lassi Items', 'Product Name': 'lassi', 'Distribution Price': 13, 'Counter Price': 15 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd 80', 'Distribution Price': 5.75, 'Counter Price': 6 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd 180', 'Distribution Price': 13.5, 'Counter Price': 15 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd 425', 'Distribution Price': 27, 'Counter Price': 30 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd liter', 'Distribution Price': 62, 'Counter Price': 68 },
    { Category: 'Curd & Paneer', 'Product Name': 'curd dtm', 'Distribution Price': 8, 'Counter Price': 10 },
    { Category: 'Curd & Paneer', 'Product Name': '100 cups', 'Distribution Price': 8.15, 'Counter Price': 9 },
    { Category: 'Curd & Paneer', 'Product Name': '170 cups', 'Distribution Price': 13.5, 'Counter Price': 15 },
    { Category: 'Curd & Paneer', 'Product Name': '400 cup', 'Distribution Price': 29, 'Counter Price': 32 },
    { Category: 'Curd & Paneer', 'Product Name': '1 litre tub', 'Distribution Price': 95, 'Counter Price': 95 },
    { Category: 'Curd & Paneer', 'Product Name': '20 liter tub', 'Distribution Price': 1450, 'Counter Price': 1535 },
    { Category: 'Curd & Paneer', 'Product Name': '10 liter tub', 'Distribution Price': 700, 'Counter Price': 730 },
    { Category: 'Curd & Paneer', 'Product Name': '5 liter tub', 'Distribution Price': 350, 'Counter Price': 330 },
    { Category: 'Curd & Paneer', 'Product Name': 'panner', 'Distribution Price': 370, 'Counter Price': 405 },
    { Category: 'Curd & Paneer', 'Product Name': 'panner 500', 'Distribution Price': 185, 'Counter Price': 205 },
    { Category: 'Curd & Paneer', 'Product Name': 'panner 200', 'Distribution Price': 80, 'Counter Price': 86 },
    { Category: 'Ghee', 'Product Name': 'cow gee kg', 'Distribution Price': 670, 'Counter Price': 710 },
    { Category: 'Ghee', 'Product Name': 'cowgee 500', 'Distribution Price': 335, 'Counter Price': 355 },
    { Category: 'Ghee', 'Product Name': 'cow ghee200', 'Distribution Price': 135, 'Counter Price': 145 },
    { Category: 'Ghee', 'Product Name': 'gee 500', 'Distribution Price': 350, 'Counter Price': 335 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'buns', 'Distribution Price': 8.25, 'Counter Price': 10 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': '400 bred', 'Distribution Price': 35, 'Counter Price': 40 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': '200 bred', 'Distribution Price': 17, 'Counter Price': 20 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'cup cace', 'Distribution Price': 32, 'Counter Price': 35 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'palem cace', 'Distribution Price': 27, 'Counter Price': 25 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'rusk', 'Distribution Price': 32, 'Counter Price': 35 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmaniya 20', 'Distribution Price': 17, 'Counter Price': 20 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmaniya 40', 'Distribution Price': 35, 'Counter Price': 40 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmaniya 60', 'Distribution Price': 54, 'Counter Price': 60 },
    { Category: 'Breads Cakes & Biscuits', 'Product Name': 'osmaniya 120', 'Distribution Price': 110, 'Counter Price': 120 },
    { Category: 'Sweets', 'Product Name': 'junnu', 'Distribution Price': 18, 'Counter Price': 20 },
    { Category: 'Sweets', 'Product Name': 'misthidoi', 'Distribution Price': 13, 'Counter Price': 15 },
    { Category: 'Sweets', 'Product Name': 'dood ped20', 'Distribution Price': 11, 'Counter Price': 12 },
    { Category: 'Sweets', 'Product Name': 'bodam barfi', 'Distribution Price': 150, 'Counter Price': 160 },
    { Category: 'Sweets', 'Product Name': 'dood peda 250', 'Distribution Price': 150, 'Counter Price': 160 },
    { Category: 'Sweets', 'Product Name': 'khalakand', 'Distribution Price': 170, 'Counter Price': 180 },
    { Category: 'Sweets', 'Product Name': 'milkcace 500', 'Distribution Price': 285, 'Counter Price': 310 },
    { Category: 'Sweets', 'Product Name': 'myshorpac', 'Distribution Price': 150, 'Counter Price': 150 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'nuvvulu 200', 'Distribution Price': 100, 'Counter Price': 105 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'lemon', 'Distribution Price': 8.5, 'Counter Price': 10 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'manga', 'Distribution Price': 13.5, 'Counter Price': 15 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'zero', 'Distribution Price': 23, 'Counter Price': 25 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'spaicy chogodi', 'Distribution Price': 110, 'Counter Price': 110 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'spaicy chogodi', 'Distribution Price': 55, 'Counter Price': 50 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'ribbon pakodi', 'Distribution Price': 95, 'Counter Price': 105 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'ribbon pakodi', 'Distribution Price': 55, 'Counter Price': 50 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'jonna murukulu', 'Distribution Price': 105, 'Counter Price': 115 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'jonna murukulu', 'Distribution Price': 60, 'Counter Price': 55 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'kaju mixer 400', 'Distribution Price': 130, 'Counter Price': 145 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'kaju mixer200', 'Distribution Price': 68, 'Counter Price': 75 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'moong dal 400', 'Distribution Price': 110, 'Counter Price': 115 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'moong dal 200', 'Distribution Price': 55, 'Counter Price': 60 },
    { Category: 'Savory Snacks & Others', 'Product Name': 'cron flakes', 'Distribution Price': 60, 'Counter Price': 60 },
];

router.post('/import-pricelist', requireAuth, async (req, res) => {
    try {
        const batch = db.batch();
        const existingProductKeys = new Set<string>();

        // Create categories
        const uniqueCategories = [...new Set(priceListData.map(item => item.Category))];
        for (const categoryName of uniqueCategories) {
            const normalizedName = normalizeString(categoryName);
            const categorySlug = NAME_TO_SLUG[categoryName] || normalizedName;
            
            // Check if category already exists in database using slug as doc ID
            const categoryDoc = collections.categories.doc(categorySlug);
            const categorySnapshot = await categoryDoc.get();
            
            if (!categorySnapshot.exists) {
                // Create new category if not exists
                batch.set(categoryDoc, {
                    name: categoryName,
                    isActive: true,
                    createdAt: new Date().toISOString()
                });
            }
        }

        // Create products
        for (const [index, item] of priceListData.entries()) {
            const productName = normalizeString(item['Product Name']);
            const categoryName = normalizeString(item.Category);
            const categoryId = NAME_TO_SLUG[item.Category] || categoryName;
            const productKey = `${categoryName}-${productName}-${index}`;

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

router.post('/import-purchases', requireAuth, upload.fields([{ name: 'image' }, { name: 'csv' }]), async (req, res) => {
    try {
        const batch = db.batch();
        let purchaseDate = req.body.purchaseDate || new Date().toISOString().split('T')[0];
        let importedCount = 0;

        const productsSnapshot = await collections.products.get();
        const products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as any
        }));

        let itemsToImport = purchaseData;
        
        // Parse CSV if provided
        if (req.files && 'csv' in req.files && req.files.csv.length > 0) {
            const csvFile = req.files.csv[0];
            const workbook = XLSX.read(csvFile.buffer);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            itemsToImport = XLSX.utils.sheet_to_json(firstSheet);
            console.log('Parsed purchases from CSV:', itemsToImport);
        }

        for (const item of itemsToImport) {
            // Support different column name variations (productName, name, product, product_name, etc.)
            const itemName = String(
                (item as any).productName ||
                (item as any).name ||
                (item as any).product ||
                (item as any).product_name ||
                ''
            );
            const itemQuantity = Number(
                (item as any).quantity ||
                (item as any).qty ||
                0
            );

            if (!itemName || itemQuantity <= 0) continue;

            const product = products.find(p => 
                p.name?.toLowerCase() === itemName.toLowerCase() ||
                p.productName?.toLowerCase() === itemName.toLowerCase()
            );

            if (product) {
                const purchaseRef = collections.purchases.doc();
                const itemPrice = Number(
                    (item as any).price ||
                    (item as any).costPrice ||
                    (item as any).cost_price ||
                    product.cost_price ||
                    product.costPrice ||
                    0
                );
                const itemTotal = Number(
                    (item as any).total ||
                    (item as any).amount ||
                    itemQuantity * itemPrice
                );
                const itemExpiry = (item as any).expiry_date || (item as any).expiryDate || null;
                
                batch.set(purchaseRef, {
                    product_id: product.id,
                    quantity: itemQuantity,
                    price: itemPrice,
                    total: itemTotal,
                    purchase_date: purchaseDate,
                    expiry_date: itemExpiry,
                    created_at: new Date().toISOString()
                });
                importedCount++;
            }
        }

        await batch.commit();

        res.json({
            success: true,
            message: 'Purchases imported successfully',
            importedCount,
            totalItems: itemsToImport.length,
            usedPhoto: !!(req.files && 'image' in req.files && req.files.image.length > 0),
            usedCSV: !!(req.files && 'csv' in req.files && req.files.csv.length > 0)
        });
    } catch (error) {
        console.error('Import purchases failed:', error);
        res.status(500).json({ success: false, error: 'Failed to import purchases' });
    }
});

// Import Sales
router.post('/import-sales', requireAuth, upload.single('csv'), async (req, res) => {
    try {
        const batch = db.batch();
        let saleDate = req.body.saleDate || new Date().toISOString().split('T')[0];
        let importedCount = 0;

        const productsSnapshot = await collections.products.get();
        const products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as any
        }));

        let itemsToImport: any[] = [];
        
        // Parse CSV if provided
        if (req.file) {
            const workbook = XLSX.read(req.file.buffer);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            itemsToImport = XLSX.utils.sheet_to_json(firstSheet);
            console.log('Parsed sales from CSV:', itemsToImport);
        }

        for (const item of itemsToImport) {
            // Support different column name variations
            const itemName = String(
                item.productName ||
                item.name ||
                item.product ||
                item.product_name ||
                ''
            );
            const itemQuantity = Number(
                item.quantity ||
                item.qty ||
                0
            );

            if (!itemName || itemQuantity <= 0) continue;

            const product = products.find(p => 
                (p.name?.toLowerCase() === itemName.toLowerCase() ||
                p.productName?.toLowerCase() === itemName.toLowerCase()
            ));

            if (product) {
                const itemPrice = Number(
                    item.price ||
                    item.salePrice ||
                    item.sale_price ||
                    product.price ||
                    product.counterPrice ||
                    0
                );
                const itemTotal = Number(
                    item.total ||
                    item.amount ||
                    itemQuantity * itemPrice
                );
                const itemStatus = String(
                    item.status ||
                    'paid'
                );
                const customerName = String(
                    item.customerName ||
                    item.customer_name ||
                    item.customer ||
                    ''
                );
                const itemSaleDate = String(
                    item.saleDate ||
                    item.sale_date ||
                    saleDate
                );

                // First, create or get customer
                let customerId = null;
                if (customerName) {
                    const customerSnapshot = await collections.customers
                        .where('name', '==', customerName)
                        .limit(1)
                        .get();
                    
                    if (customerSnapshot.empty) {
                        const customerDoc = collections.customers.doc();
                        batch.set(customerDoc, {
                            name: customerName,
                            phone: null,
                            email: null,
                            address: null,
                            balance: 0,
                            created_at: new Date().toISOString()
                        });
                        customerId = customerDoc.id;
                    } else {
                        customerId = customerSnapshot.docs[0].id;
                    }
                }

                // Create sale record
                const saleRef = collections.sales.doc();
                batch.set(saleRef, {
                    product_id: product.id,
                    customer_id: customerId,
                    quantity: itemQuantity,
                    price: itemPrice,
                    total: itemTotal,
                    sale_date: itemSaleDate,
                    sale_type: 'counter',
                    status: itemStatus as 'paid' | 'pending' | 'overdue',
                    due_date: itemStatus === 'pending' ? itemSaleDate : null,
                    amount_paid: itemStatus === 'paid' ? itemTotal : 0,
                    created_at: new Date().toISOString()
                });
                importedCount++;
            }
        }

        await batch.commit();

        res.json({
            success: true,
            message: 'Sales imported successfully',
            importedCount,
            totalItems: itemsToImport.length,
            usedCSV: !!req.file
        });
    } catch (error) {
        console.error('Import sales failed:', error);
        res.status(500).json({ success: false, error: 'Failed to import sales' });
    }
});

export default router;
