/**
 * Firebase Firestore Seed Script
 * Run: npx ts-node src/seed-firebase.ts
 * This creates all required collections with sample data.
 */

import * as admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = path.join(process.cwd(), './firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
    });
}

const db = admin.firestore();

async function seed() {
    console.log('🌱 Seeding Firestore database...\n');

    // 1. Products
    const productsRef = db.collection('products');
    const milk = await productsRef.add({
        name: 'Full Cream Milk',
        category: 'Milk',
        unit: 'litre',
        price: 60,
        cost_price: 45,
        min_stock: 10,
        track_expiry: true,
        expiry_days: 3,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    const curd = await productsRef.add({
        name: 'Curd',
        category: 'Dairy',
        unit: 'kg',
        price: 80,
        cost_price: 55,
        min_stock: 5,
        track_expiry: true,
        expiry_days: 2,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ products created');

    // 2. Customers
    const customersRef = db.collection('customers');
    const customer1 = await customersRef.add({
        name: 'Ravi Kumar',
        phone: '9876543210',
        email: 'ravi@example.com',
        address: '12 MG Road, Hyderabad',
        credit_limit: 5000,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    const customer2 = await customersRef.add({
        name: 'Priya Sharma',
        phone: '9123456780',
        email: 'priya@example.com',
        address: '45 Park Lane, Hyderabad',
        credit_limit: 3000,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ customers created');

    // 3. Purchases
    const purchasesRef = db.collection('purchases');
    await purchasesRef.add({
        product_id: milk.id,
        quantity: 100,
        price: 45,
        total: 4500,
        purchase_date: admin.firestore.Timestamp.now(),
        expiry_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 86400000)),
    });
    await purchasesRef.add({
        product_id: curd.id,
        quantity: 30,
        price: 55,
        total: 1650,
        purchase_date: admin.firestore.Timestamp.now(),
        expiry_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 86400000)),
    });
    console.log('✅ purchases created');

    // 4. Sales
    const salesRef = db.collection('sales');
    const sale1 = await salesRef.add({
        product_id: milk.id,
        customer_id: customer1.id,
        quantity: 10,
        price: 60,
        total: 600,
        sale_date: admin.firestore.Timestamp.now(),
        invoice_number: 'INV-001',
        status: 'paid',
        amount_paid: 600,
    });
    await salesRef.add({
        product_id: curd.id,
        customer_id: customer2.id,
        quantity: 5,
        price: 80,
        total: 400,
        sale_date: admin.firestore.Timestamp.now(),
        invoice_number: 'INV-002',
        status: 'pending',
        due_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)),
        amount_paid: 0,
    });
    console.log('✅ sales created');

    // 5. Payments
    const paymentsRef = db.collection('payments');
    await paymentsRef.add({
        sale_id: sale1.id,
        amount: 600,
        payment_date: admin.firestore.Timestamp.now(),
        payment_method: 'cash',
        notes: 'Full payment received',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ payments created');

    // 6. Expenses
    const expensesRef = db.collection('expenses');
    await expensesRef.add({
        category: 'Transport',
        amount: 500,
        notes: 'Fuel for delivery',
        expense_date: admin.firestore.Timestamp.now(),
    });
    await expensesRef.add({
        category: 'Electricity',
        amount: 1200,
        notes: 'Monthly bill',
        expense_date: admin.firestore.Timestamp.now(),
    });
    console.log('✅ expenses created');

    // 7. Waste
    const wasteRef = db.collection('waste');
    await wasteRef.add({
        product_id: milk.id,
        quantity: 2,
        reason: 'expired',
        cost_value: 90,
        waste_date: admin.firestore.Timestamp.now(),
        notes: 'Left out overnight',
    });
    console.log('✅ waste created');

    // 8. Stock Logs
    const stockLogsRef = db.collection('stock_logs');
    await stockLogsRef.add({
        product_id: milk.id,
        quantity: 100,
        action_type: 'IN',
        updated_by: 'admin',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    await stockLogsRef.add({
        product_id: milk.id,
        quantity: 10,
        action_type: 'OUT',
        updated_by: 'admin',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ stock_logs created');

    console.log('\n🎉 Firestore seeding complete! All 8 collections are ready.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
