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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_1 = __importDefault(require("https"));
dotenv_1.default.config();
const supabaseUrl = (_a = process.env.SUPABASE_URL) === null || _a === void 0 ? void 0 : _a.trim();
const supabaseKey = (_b = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)) === null || _b === void 0 ? void 0 : _b.trim();
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key');
}
const ipv4Agent = new https_1.default.Agent({ family: 4, keepAlive: true });
const fetchWithTimeout = (input, init) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const controller = new AbortController();
    const timeoutMs = Number.parseInt(process.env.SUPABASE_FETCH_TIMEOUT_MS || '8000', 10);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = yield (0, node_fetch_1.default)(input, Object.assign(Object.assign({}, init), { signal: (_a = init === null || init === void 0 ? void 0 : init.signal) !== null && _a !== void 0 ? _a : controller.signal, agent: ipv4Agent }));
        return response;
    }
    finally {
        clearTimeout(timeout);
    }
});
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    global: {
        fetch: fetchWithTimeout,
    },
});
