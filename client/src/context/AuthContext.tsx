'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

interface AuthUser {
    id: string | number;
    email: string;
    role?: string;
    access_token?: string;
    session?: {
        access_token: string;
    };
    [key: string]: unknown;
}

interface AuthContextType {
    readonly user: AuthUser | null;
    readonly login: (userData: AuthUser) => void;
    readonly logout: (reason?: string) => Promise<void>;
    readonly loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: async () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { readonly children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    const logout = useCallback(async (reason?: string) => {
        try {
            const token = user?.session?.access_token || user?.access_token;
            if (token) {
                const baseUrl = getApiBaseUrl();
                await fetch(`${baseUrl}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (e) {
            console.warn('Logout API error', e);
        }

        setUser(null);
        localStorage.removeItem('dairy_user');
        localStorage.removeItem('dairy_login_timestamp');

        if (reason === 'session_expired') {
            router.push('/login?reason=session_expired');
        } else {
            router.push('/login');
        }
    }, [user, router]);

    const checkSessionExpiry = useCallback(() => {
        const timestamp = localStorage.getItem('dairy_login_timestamp');
        if (timestamp) {
            const timePassed = Date.now() - Number.parseInt(timestamp, 10);
            if (timePassed > SESSION_DURATION) {
                console.warn('Session expired. Logging out.');
                logout('session_expired');
            }
        }
    }, [logout, SESSION_DURATION]);

    useEffect(() => {
        const storedUser = localStorage.getItem('dairy_user');
        if (storedUser) {
            try {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser(JSON.parse(storedUser));
                checkSessionExpiry();
            } catch (e) {
                console.warn('Error parsing stored user', e);
                localStorage.removeItem('dairy_user');
            }
        }
        setLoading(false);

        // Check session expiry on focus
        const handleFocus = () => checkSessionExpiry();
        globalThis.window?.addEventListener('focus', handleFocus);
        return () => globalThis.window?.removeEventListener('focus', handleFocus);
    }, [checkSessionExpiry]);

    const login = useCallback((userData: AuthUser) => {
        setUser(userData);
        localStorage.setItem('dairy_user', JSON.stringify(userData));
        localStorage.setItem('dairy_login_timestamp', Date.now().toString());
        router.push('/dashboard');
    }, [router]);

    const contextValue = useMemo(() => ({
        user,
        login,
        logout,
        loading
    }), [user, login, logout, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
