'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

interface Category {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

interface CategoryContextType {
    categories: Category[];
    loading: boolean;
    error: string | null;
    refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const refreshCategories = async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (err: any) {
            console.error('Failed to fetch categories:', err);
            setError(err.response?.data?.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshCategories();
    }, [user]);

    return (
        <CategoryContext.Provider
            value={{
                categories,
                loading,
                error,
                refreshCategories
            }}
        >
            {children}
        </CategoryContext.Provider>
    );
}

export function useCategories() {
    const context = useContext(CategoryContext);
    if (context === undefined) {
        throw new Error('useCategories must be used within a CategoryProvider');
    }
    return context;
}