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

    useEffect(() => {
        const storedUser = localStorage.getItem('dairy_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData: any) => {
        setUser(userData);
        localStorage.setItem('dairy_user', JSON.stringify(userData));
        router.push('/dashboard');
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('dairy_user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
