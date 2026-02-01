'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: any;
    login: (token: any) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    const logout = async (reason?: string) => {
        try {
            // Call server to invalidate session
            // We use fetch directly or imported api to avoid circular dependencies if any, 
            // but api instance is better. Assuming api import is possible or using fetch.
            // Using fetch to be safe from circular dep with interceptors for now if api.ts uses useAuth (it doesn't).
            const token = user?.session?.access_token || user?.access_token;
            if (token) {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (e) {
            console.error('Logout API error', e);
        }

        setUser(null);
        localStorage.removeItem('dairy_user');
        localStorage.removeItem('dairy_login_timestamp');

        if (reason === 'session_expired') {
            router.push('/login?reason=session_expired');
        } else {
            router.push('/login');
        }
    };

    const checkSessionExpiry = () => {
        const timestamp = localStorage.getItem('dairy_login_timestamp');
        if (timestamp) {
            const timePassed = Date.now() - parseInt(timestamp, 10);
            if (timePassed > SESSION_DURATION) {
                console.warn('Session expired. Logging out.');
                logout('session_expired');
            }
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('dairy_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            checkSessionExpiry();
        }
        setLoading(false);

        // Check session expiry on focus
        const handleFocus = () => checkSessionExpiry();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const login = (userData: any) => {
        setUser(userData);
        localStorage.setItem('dairy_user', JSON.stringify(userData));
        localStorage.setItem('dairy_login_timestamp', Date.now().toString());
        router.push('/dashboard');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
