import express from 'express';
import cors from 'cors';
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

app.use(compression()); // [NEW] Compress all routes
app.use(express.json());


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
                console.log("Blocked by CORS:", origin);
                callback(null, true); // Allow anyway but log it for debugging
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
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/', transactionRoutes); // /purchases, /sales, /expenses
app.use('/reports', reportRoutes);
app.use('/waste', wasteRoutes);
app.use('/customers', customersRoutes);
app.use('/finance', financeRoutes);
app.use('/stock', stockRoutes);
app.use('/upload', uploadRouter); // [NEW] Mount upload route


app.get('/supabase-test', async (req, res) => {
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    if (error) {
        res.status(500).json({ status: 'error', message: error.message });
    } else {
        res.json({ status: 'connected', count: data });
    }
});

// Initialize calendar months for reports
const initCalendar = async () => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const { error } = await supabase.rpc('populate_calendar_months', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    });

    if (error) {
        console.error('Error initializing calendar:', error);
    } else {
        console.log('Calendar months initialized');
    }
};


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
