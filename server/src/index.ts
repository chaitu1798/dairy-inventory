import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import transactionRoutes from './routes/transactions';
import reportRoutes from './routes/reports';
import wasteRoutes from './routes/waste';
import customersRoutes from './routes/customers';
import financeRoutes from './routes/finance';
import stockRoutes from './routes/stock';
import uploadRouter from './routes/upload';
import { supabase } from './supabase';

import dotenv from 'dotenv';

dotenv.config();

import compression from 'compression'; // [NEW]

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy if we are behind a reverse proxy (like Render, Railway, Vercel) for accurate client IPs
app.set('trust proxy', 1);

app.use(morgan('dev')); // [NEW] Request logging
app.use(compression()); // [NEW] Compress all routes
app.use(express.json());

// Global Rate Limiting for auth and upload to prevent abuse
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // limit each IP to 50 uploads per hour
});


// Configure CORS to allow frontend domains
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://dairy-inventory.vercel.app",
    "https://dairy-inventory-production.up.railway.app"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) {
                return callback(null, true);
            }

            // Check if origin is in allowed list OR is a Vercel/Railway preview deployment
            const isAllowed = allowedOrigins.includes(origin) ||
                origin.includes('.vercel.app') ||
                origin.includes('.up.railway.app');

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
        preflightContinue: false,
        optionsSuccessStatus: 200,
    })
);

// Important: handle all OPTIONS requests
app.options("*", cors());

// Root route for health check
app.get('/', (req, res) => {
    res.json({ message: 'Dairy Inventory API is running 🚀' });
});

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/products', productRoutes);
app.use('/', transactionRoutes); // /purchases, /sales, /expenses
app.use('/reports', reportRoutes);
app.use('/waste', wasteRoutes);
app.use('/customers', customersRoutes);
app.use('/finance', financeRoutes);
app.use('/stock', stockRoutes);
app.use('/upload', uploadLimiter, uploadRouter); // [NEW] Mount upload route


app.get('/supabase-test', async (req, res) => {
    const { count, error } = await supabase.from('products').select('id', { count: 'exact', head: true });
    if (error) {
        res.status(500).json({ status: 'error', message: error.message });
    } else {
        res.json({ status: 'connected', count: count ?? null });
    }
});

app.get('/health/deps', async (_req, res) => {
    try {
        const startedAt = Date.now();
        const { error, count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true });
        const latencyMs = Date.now() - startedAt;

        if (error) {
            return res.status(503).json({
                status: 'degraded',
                timestamp: new Date().toISOString(),
                supabase: {
                    reachable: false,
                    latency_ms: latencyMs,
                    message: error.message || 'Supabase query failed',
                    code: error.code || null,
                }
            });
        }

        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            supabase: {
                reachable: true,
                latency_ms: latencyMs,
                products_count: count ?? null,
            }
        });
    } catch (error: unknown) {
        const err = error as { message?: string; code?: string; cause?: { code?: string; message?: string } };
        return res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            supabase: {
                reachable: false,
                message: err.message || 'Supabase unreachable',
                code: err.code || err.cause?.code || null,
                cause: err.cause?.message || null
            }
        });
    }
});

// Initialize calendar months for reports
const initCalendar = async () => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    startDate.setUTCDate(1);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setUTCDate(1);
    endDate.setUTCHours(0, 0, 0, 0);

    const months: { month_start: string }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        months.push({ month_start: cursor.toISOString().split('T')[0] });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const { error } = await supabase
        .from('calendar_months')
        .upsert(months, { onConflict: 'month_start', ignoreDuplicates: true });

    if (error) {
        const isNetworkTimeout =
            error.message?.includes('fetch failed') ||
            error.details?.includes('UND_ERR_CONNECT_TIMEOUT') ||
            error.message?.includes('AbortError') ||
            error.details?.includes('AbortError');

        if (isNetworkTimeout) {
            console.warn('Calendar initialization skipped: Supabase is currently unreachable or request timed out.');
        } else {
            console.error('Error initializing calendar:', error);
        }
    } else {
        console.log('Calendar months initialized');
    }
};

// Error handling middleware should be added after all routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err.message || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});


app.listen(port, () => {
    console.log(`\n--- Server Started ---`);
    console.log(`Local: http://localhost:${port}`);

    // Environment Check
    const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
    const missingEnv = requiredEnv.filter(key => !process.env[key]);

    if (missingEnv.length > 0) {
        console.error(`\n❌ CRITICAL ERROR: Missing environment variables: ${missingEnv.join(', ')}`);
        console.error('Server may crash or fail to upload images.\n');
        // We don't exit process.exit(1) to allow dev debugging, but logging is critical
    } else {
        console.log('✅ Environment check passed');
    }

    console.log('Stock/Upload routes loaded');
    initCalendar();
});
