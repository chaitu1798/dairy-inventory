import axios from 'axios';

// Robust base URL determination
let baseURL = process.env.NEXT_PUBLIC_API_URL;

// If running in browser on localhost and no env var is set, default to port 3001
if (!baseURL && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    baseURL = 'http://localhost:3001';
}

// Final fallback
baseURL = baseURL || 'http://localhost:3001';

console.log('API Base URL:', baseURL);

const api = axios.create({
    baseURL
});

export default api;
