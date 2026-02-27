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
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const reports_1 = __importDefault(require("./routes/reports"));
const waste_1 = __importDefault(require("./routes/waste"));
const customers_1 = __importDefault(require("./routes/customers"));
const finance_1 = __importDefault(require("./routes/finance"));
const stock_1 = __importDefault(require("./routes/stock"));
const upload_1 = __importDefault(require("./routes/upload"));
const supabase_1 = require("./supabase");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const compression_1 = __importDefault(require("compression")); // [NEW]
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Trust proxy if we are behind a reverse proxy (like Render, Railway, Vercel) for accurate client IPs
app.set('trust proxy', 1);
app.use((0, morgan_1.default)('dev')); // [NEW] Request logging
app.use((0, compression_1.default)()); // [NEW] Compress all routes
app.use(express_1.default.json());
// Global Rate Limiting for auth and upload to prevent abuse
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
const uploadLimiter = (0, express_rate_limit_1.default)({
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
app.use((0, cors_1.default)({
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
        }
        else {
            console.warn("Blocked by CORS:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
}));
// Important: handle all OPTIONS requests
app.options("*", (0, cors_1.default)());
// Root route for health check
app.get('/', (req, res) => {
    res.json({ message: 'Dairy Inventory API is running 🚀' });
});
// Routes
app.use('/auth', authLimiter, auth_1.default);
app.use('/products', products_1.default);
app.use('/', transactions_1.default); // /purchases, /sales, /expenses
app.use('/reports', reports_1.default);
app.use('/waste', waste_1.default);
app.use('/customers', customers_1.default);
app.use('/finance', finance_1.default);
app.use('/stock', stock_1.default);
app.use('/upload', uploadLimiter, upload_1.default); // [NEW] Mount upload route
app.get('/supabase-test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { count, error } = yield supabase_1.supabase.from('products').select('id', { count: 'exact', head: true });
    if (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
    else {
        res.json({ status: 'connected', count: count !== null && count !== void 0 ? count : null });
    }
}));
app.get('/health/deps', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const startedAt = Date.now();
        const { error, count } = yield supabase_1.supabase
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
                products_count: count !== null && count !== void 0 ? count : null,
            }
        });
    }
    catch (error) {
        const err = error;
        return res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            supabase: {
                reachable: false,
                message: err.message || 'Supabase unreachable',
                code: err.code || ((_a = err.cause) === null || _a === void 0 ? void 0 : _a.code) || null,
                cause: ((_b = err.cause) === null || _b === void 0 ? void 0 : _b.message) || null
            }
        });
    }
}));
// Initialize calendar months for reports
const initCalendar = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    startDate.setUTCDate(1);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setUTCDate(1);
    endDate.setUTCHours(0, 0, 0, 0);
    const months = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        months.push({ month_start: cursor.toISOString().split('T')[0] });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    const { error } = yield supabase_1.supabase
        .from('calendar_months')
        .upsert(months, { onConflict: 'month_start', ignoreDuplicates: true });
    if (error) {
        const isNetworkTimeout = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('fetch failed')) ||
            ((_b = error.details) === null || _b === void 0 ? void 0 : _b.includes('UND_ERR_CONNECT_TIMEOUT'));
        if (isNetworkTimeout) {
            console.warn('Calendar initialization skipped: Supabase is currently unreachable.');
        }
        else {
            console.error('Error initializing calendar:', error);
        }
    }
    else {
        console.log('Calendar months initialized');
    }
});
// Error handling middleware should be added after all routes
app.use((err, req, res, next) => {
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
    }
    else {
        console.log('✅ Environment check passed');
    }
    console.log('Stock/Upload routes loaded');
    initCalendar();
});
