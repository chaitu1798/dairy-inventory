import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!serviceAccountPath) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PATH in environment variables');
}

// Resolve the path to the service account JSON
const absolutePath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(absolutePath),
        storageBucket: storageBucket
    });
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();

// Helper to handle Firestore collection references
export const collections = {
    products: db.collection('products'),
    customers: db.collection('customers'),
    sales: db.collection('sales'),
    purchases: db.collection('purchases'),
    expenses: db.collection('expenses'),
    waste: db.collection('waste'),
    stock_logs: db.collection('stock_logs'),
    payments: db.collection('payments'),
};
