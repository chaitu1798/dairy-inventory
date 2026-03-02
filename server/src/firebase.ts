import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
    let appOptions: admin.AppOptions = { storageBucket };

    if (serviceAccountJson) {
        // Option 1: Inline JSON string (best for containers/Cloud Run)
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            appOptions.credential = admin.credential.cert(serviceAccount);
            console.log('[Firebase] Using inline service account JSON credentials');
        } catch (error) {
            throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid JSON string.');
        }
    } else if (serviceAccountPath) {
        // Option 2: File path (good for local development)
        const absolutePath = path.isAbsolute(serviceAccountPath)
            ? serviceAccountPath
            : path.join(process.cwd(), serviceAccountPath);
        appOptions.credential = admin.credential.cert(absolutePath);
        console.log('[Firebase] Using service account file at:', absolutePath);
    } else {
        // Option 3: Application Default Credentials (automatic on Cloud Run / GCP)
        // No explicit credential needed — will use the GCP service account attached to the instance
        appOptions.credential = admin.credential.applicationDefault();
        console.log('[Firebase] Using Application Default Credentials (GCP/Cloud Run)');
    }

    admin.initializeApp(appOptions);
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

