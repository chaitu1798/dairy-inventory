import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import transactionRoutes from './routes/transactions';
import reportRoutes from './routes/reports';
import { supabase } from './supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

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
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.log("Blocked by CORS:", origin);
                callback(null, false); // DO NOT THROW ERROR
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        preflightContinue: false,
        optionsSuccessStatus: 200, // Important for Safari & Vercel
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
    console.log(`Server running on port ${port}`);
    initCalendar();
});
