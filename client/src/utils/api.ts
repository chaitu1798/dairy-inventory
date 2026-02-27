import axios from 'axios';
import { getApiBaseUrl } from './apiBaseUrl';

const baseURL = getApiBaseUrl();

if (process.env.NODE_ENV === 'development') {
    console.log('API Base URL:', baseURL || '(same-origin)');
}

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
    if (typeof globalThis.window !== 'undefined') {
        globalThis.window.dispatchEvent(new Event('axios-request-start'));
    }

    if (process.env.NODE_ENV === 'development') {
        console.log('[API Request]:', request.method?.toUpperCase(), request.url);
    }

    // Add Authorization header if user is logged in
    if (typeof globalThis.window !== 'undefined') {
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
            console.warn('Error reading user token for API request:', e);
        }
    }

    return request;
}, error => {
    if (typeof globalThis.window !== 'undefined') {
        globalThis.window.dispatchEvent(new Event('axios-request-end'));
    }
    return Promise.reject(error);
});

// Response interceptor to handle authentication errors
api.interceptors.response.use(
    (response) => {
        if (typeof globalThis.window !== 'undefined') {
            globalThis.window.dispatchEvent(new Event('axios-request-end'));
        }
        return response;
    },
    (error) => {
        if (typeof globalThis.window !== 'undefined') {
            globalThis.window.dispatchEvent(new Event('axios-request-end'));
        }

        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized access. Redirecting to login...');
            if (typeof globalThis.window !== 'undefined') {
                localStorage.removeItem('dairy_user');
                localStorage.removeItem('dairy_login_timestamp');
                globalThis.window.location.href = '/login';
            }
        }

        // Extract server error message if available
        const serverMessage = error.response?.data?.error || error.response?.data?.message;
        if (serverMessage) {
            error.serverMessage = serverMessage;
        }

        return Promise.reject(error);
    }
);

export default api;

