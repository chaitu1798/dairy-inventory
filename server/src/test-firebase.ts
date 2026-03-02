import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";
const absolutePath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath);

console.log('Using service account at:', absolutePath);

try {
    admin.initializeApp({
        credential: admin.credential.cert(absolutePath)
    });
    const db = admin.firestore();
    db.collection('products').limit(1).get()
        .then(snapshot => {
            console.log('Successfully connected to Firestore!');
            console.log('Number of products found:', snapshot.size);
            process.exit(0);
        })
        .catch(err => {
            console.error('Failed to connect to Firestore:', err);
            process.exit(1);
        });
} catch (err) {
    console.error('Initialization error:', err);
    process.exit(1);
}
