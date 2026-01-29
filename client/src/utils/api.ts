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
    // Dispatch event to show global spinner
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('axios-request-start'));
    }

    console.log('[API Request]:', request.method?.toUpperCase(), request.url, 'Base:', request.baseURL);

    // Add Authorization header if user is logged in
    if (typeof window !== 'undefined') {
        try {
            const userStr = localStorage.getItem('dairy_user');
            if (userStr) {
                const userData = JSON.parse(userStr);

                // Try to find the access token in various common Supabase locations
                // 1. userData.session.access_token (standard)
                // 2. userData.access_token (if just session stored)
                // 3. userData.data.session.access_token (if raw response stored)

                let token = userData?.session?.access_token || userData?.access_token;

                if (!token && userData?.data?.session?.access_token) {
                    token = userData.data.session.access_token;
                }

                if (token) {
                    request.headers.Authorization = `Bearer ${token}`;
                } else {
                    console.warn('User logged in but no access token found in storage');
                }
            }
        } catch (e) {
            console.error('Error reading user token for API request:', e);
        }
    }

    return request;
}, error => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('axios-request-end'));
    }
    return Promise.reject(error);
});

// Response interceptor to handle authentication errors
api.interceptors.response.use(
    (response) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('axios-request-end'));
        }
        return response;
    },
    (error) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('axios-request-end'));
        }

        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized access. Redirecting to login...');
            if (typeof window !== 'undefined') {
                localStorage.removeItem('dairy_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

