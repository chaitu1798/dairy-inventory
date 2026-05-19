'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';
import api from '../utils/api';

interface AuthUser extends User {
    role?: string;
    access_token?: string;
}

interface AuthContextType {
    readonly user: AuthUser | null;
    readonly login: () => void;
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

    // Helper to manage session cookie for Next.js Middleware
    const setSessionCookie = (token: string | null) => {
        if (typeof document !== 'undefined') {
            if (token) {
                document.cookie = `dairy_session=${token}; path=/; max-age=3600; SameSite=Lax`;
            } else {
                document.cookie = 'dairy_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const token = await getIdToken(firebaseUser, true);
                    
                    // Requirement #3: Verify token validity with the backend
                    try {
                        // We pass the token explicitly in case localStorage isn't updated yet
                        await api.get('/auth/verify', {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        const authUser: AuthUser = {
                            ...firebaseUser,
                            access_token: token
                        } as AuthUser;

                        setUser(authUser);
                        setSessionCookie(token);

                        // Maintain legacy storage for API interceptor compatibility (api.ts)
                        localStorage.setItem('dairy_user', JSON.stringify({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            access_token: token
                        }));
                    } catch (verifyError) {
                        console.error('Backend token verification failed:', verifyError);
                        setUser(null);
                        setSessionCookie(null);
                        localStorage.removeItem('dairy_user');
                        await signOut(auth);
                    }
                } catch (error) {
                    console.error('Error getting Firebase token:', error);
                    setUser(null);
                    setSessionCookie(null);
                    localStorage.removeItem('dairy_user');
                }
            } else {
                setUser(null);
                setSessionCookie(null);
                localStorage.removeItem('dairy_user');
                localStorage.removeItem('dairy_login_timestamp');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = useCallback(async (reason?: string) => {
        try {
            await signOut(auth);
        } catch (e) {
            console.warn('Logout error', e);
        }

        setUser(null);
        setSessionCookie(null);
        localStorage.removeItem('dairy_user');
        localStorage.removeItem('dairy_login_timestamp');

        if (reason === 'session_expired') {
            router.push('/login?reason=session_expired');
        } else {
            router.push('/login');
        }
    }, [router]);

    const login = useCallback(() => {
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
