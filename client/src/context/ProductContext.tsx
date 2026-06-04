'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import { Product } from '../types';

interface ProductContextType {
    products: Product[];
    loading: boolean;
    error: string | null;
    refreshProducts: () => Promise<void>;
    updateProduct: (productId: string | number, updatedProduct: Partial<Product>) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const refreshProducts = async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/products?limit=10000');
            const data = response.data.data || response.data;
            setProducts(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to fetch products:', err);
            setError(err.response?.data?.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const updateProduct = (productId: string | number, updatedProduct: Partial<Product>) => {
        setProducts(prev => prev.map(product => 
            String(product.id) === String(productId) ? { ...product, ...updatedProduct } : product
        ));
    };

    useEffect(() => {
        refreshProducts();
    }, [user]);

    return (
        <ProductContext.Provider
            value={{
                products,
                loading,
                error,
                refreshProducts,
                updateProduct
            }}
        >
            {children}
        </ProductContext.Provider>
    );
}

export function useProducts() {
    const context = useContext(ProductContext);
    if (context === undefined) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
}
