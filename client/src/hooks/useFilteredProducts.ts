import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Product } from '../types';

interface UseFilteredProductsResult {
    products: Product[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useFilteredProducts = (categoryId?: string): UseFilteredProductsResult => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        // If no categoryId provided, we could skip or fetch all
        if (!categoryId) {
            setProducts([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            let url = `/products?limit=1000`; 
            if (categoryId !== 'all') {
                url += `&categoryId=${categoryId}`;
            }

            const res = await api.get(url);
            const data = res.data.data || res.data;
            
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        } catch (err: unknown) {
            const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            const msg = serverMessage || (err instanceof Error ? err.message : 'Failed to fetch products');
            console.error('Error fetching filtered products:', msg);
            setError(msg);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return {
        products,
        loading,
        error,
        refetch: fetchProducts
    };
};
