"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const reports_1 = __importDefault(require("./routes/reports"));
const waste_1 = __importDefault(require("./routes/waste"));
const customers_1 = __importDefault(require("./routes/customers"));
const finance_1 = __importDefault(require("./routes/finance"));
const stock_1 = __importDefault(require("./routes/stock"));
const upload_1 = __importDefault(require("./routes/upload"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Trust proxy if we are behind a reverse proxy
app.set('trust proxy', 1);
app.use((0, morgan_1.default)('dev'));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
// Global Rate Limiting
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
const uploadLimiter = (0, express_rate_limit_1.default)({
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
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) ||
            origin.includes('.vercel.app') ||
            origin.includes('.web.app'); // Firebase Hosting
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
}));
app.options("*", (0, cors_1.default)());
// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Dairy Inventory API (Firebase) is running 🚀' });
});
// Routes
app.use('/auth', authLimiter, auth_1.default);
app.use('/products', products_1.default);
app.use('/', transactions_1.default);
app.use('/reports', reports_1.default);
app.use('/waste', waste_1.default);
app.use('/customers', customers_1.default);
app.use('/finance', finance_1.default);
app.use('/stock', stock_1.default);
app.use('/upload', uploadLimiter, upload_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use((err, req, res, next) => {
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
