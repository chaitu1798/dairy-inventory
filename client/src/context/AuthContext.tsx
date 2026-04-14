'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';

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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const token = await getIdToken(firebaseUser, true);
                    const authUser: AuthUser = {
                        ...firebaseUser,
                        access_token: token
                    } as AuthUser;

                    setUser(authUser);
                    // Maintain legacy storage for API interceptor compatibility (api.ts)
                    localStorage.setItem('dairy_user', JSON.stringify({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        access_token: token
                    }));
                } catch (error) {
                    console.error('Error getting Firebase token:', error);
                    setUser(null);
                    localStorage.removeItem('dairy_user');
                }
            } else {
                setUser(null);
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
        localStorage.removeItem('dairy_user');
        localStorage.removeItem('dairy_login_timestamp');

        if (reason === 'session_expired') {
            router.push('/login?reason=session_expired');
        } else {
            router.push('/login');
        }
    }, [router]);

    const login = useCallback(() => {
        // This is now mostly handled by onAuthStateChanged after the actual login call
        // But we can use it to force a redirect if needed
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
