import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import transactionRoutes from './routes/transactions';
import reportRoutes from './routes/reports';
import wasteRoutes from './routes/waste';
import customersRoutes from './routes/customers';
import financeRoutes from './routes/finance';
import stockRoutes from './routes/stock';
import uploadRouter from './routes/upload';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy if we are behind a reverse proxy
app.set('trust proxy', 1);

app.use(morgan('dev'));
app.use(compression());
app.use(express.json());

// Global Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
});

// Configure CORS
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://dairy-inventory.vercel.app",
    "https://dairy-inventory-23ee3.web.app" // New Firebase Hosting domain
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            const isAllowed = allowedOrigins.includes(origin) ||
                origin.includes('.vercel.app') ||
                origin.includes('.web.app'); // Firebase Hosting

            if (isAllowed) {
                callback(null, true);
            } else {
                console.warn("Blocked by CORS:", origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.options("*", cors());

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Dairy Inventory API (Firebase) is running 🚀' });
});

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/products', productRoutes);
app.use('/', transactionRoutes);
app.use('/reports', reportRoutes);
app.use('/waste', wasteRoutes);
app.use('/customers', customersRoutes);
app.use('/finance', financeRoutes);
app.use('/stock', stockRoutes);
app.use('/upload', uploadLimiter, uploadRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err.message || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

app.listen(port, () => {
    console.log(`\n--- Server Started (Firebase Backend) ---`);
    console.log(`Local: http://localhost:${port}`);

    // Environment Check
    const hasCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!hasCredentials) {
        console.warn('⚠️  No FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH set — using Application Default Credentials (ADC)');
    }
    if (!process.env.FIREBASE_STORAGE_BUCKET) {
        console.warn('⚠️  FIREBASE_STORAGE_BUCKET is not set — image uploads may fail');
    }
    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY is not set — AI image analysis will be disabled');
    }
    console.log('✅ Environment check passed');
});
