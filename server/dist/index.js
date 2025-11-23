"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const reports_1 = __importDefault(require("./routes/reports"));
const supabase_1 = require("./supabase");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Configure CORS to allow frontend domains
const allowedOrigins = [
    'http://localhost:3000',
    'https://dairy-inventory-vercel.vercel.app', // Replace with your actual Vercel domain
    process.env.FRONTEND_URL // Optional: set this in your backend environment variables
].filter((origin) => Boolean(origin));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Root route for health check
app.get('/', (req, res) => {
    res.json({ message: 'Dairy Inventory API is running 🚀' });
});
// Routes
app.use('/auth', auth_1.default);
app.use('/products', products_1.default);
app.use('/', transactions_1.default); // /purchases, /sales, /expenses
app.use('/reports', reports_1.default);
app.get('/supabase-test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('products').select('count', { count: 'exact', head: true });
    if (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
    else {
        res.json({ status: 'connected', count: data });
    }
}));
// Initialize calendar months for reports
const initCalendar = () => __awaiter(void 0, void 0, void 0, function* () {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2); // Start from 2 years ago
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // Up to next year
    const { error } = yield supabase_1.supabase.rpc('populate_calendar_months', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    });
    if (error) {
        console.error('Error initializing calendar:', error);
    }
    else {
        console.log('Calendar months initialized');
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    initCalendar();
});
