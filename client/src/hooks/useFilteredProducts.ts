import { useCallback, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { Product } from '../types';

interface UseFilteredProductsResult {
    products: Product[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useFilteredProducts = (categoryId?: string): UseFilteredProductsResult => {
    const { products: allProducts, loading, error, refreshProducts } = useProducts();

    const filteredProducts = useMemo(() => {
        // If no categoryId provided, return empty array to match previous behavior
        if (!categoryId) return [];
        // If categoryId is 'all' or not specified, return all products
        if (categoryId === 'all') return allProducts;
        // Otherwise filter by categoryId
        return allProducts.filter(product => 
            String(product.categoryId) === String(categoryId)
        );
    }, [allProducts, categoryId]);

    const refetch = useCallback(async () => {
        await refreshProducts();
    }, [refreshProducts]);

    return {
        products: filteredProducts,
        loading,
        error,
        refetch
    };
};
