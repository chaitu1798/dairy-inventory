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

// Defensive: Remove trailing /api if present in baseURL (in case env var is wrong)
if (api.defaults.baseURL?.endsWith('/api')) {
    api.defaults.baseURL = api.defaults.baseURL.slice(0, -4);
}
if (api.defaults.baseURL?.endsWith('/api/')) {
    api.defaults.baseURL = api.defaults.baseURL.slice(0, -5);
}

// Request interceptor to add Auth token
api.interceptors.request.use(request => {
    console.log('[API Request]:', request.method?.toUpperCase(), request.url, 'Base:', request.baseURL);

    // Add Authorization header if user is logged in
    if (typeof window !== 'undefined') {
        try {
            const userStr = localStorage.getItem('dairy_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Supabase typically returns { user, session: { access_token: "..." } } 
                // OR sometimes just the session depending on how it was stored.
                // Based on AuthContext.tsx, it stores what signIpWithPassword returns, which is { user, session }.

                const token = user?.session?.access_token;

                if (token) {
                    request.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (e) {
            console.error('Error reading user token for API request:', e);
        }
    }

    return request;
});

export default api;

