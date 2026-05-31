import { Category } from '../types';

export const CATEGORIES: Category[] = [
    { id: 'milk-products', name: 'Milk Products' },
    { id: 'lassi-items', name: 'Lassi Items' },
    { id: 'curd-paneer', name: 'Curd & Paneer' },
    { id: 'ghee', name: 'Ghee' },
    { id: 'breads-cakes-biscuits', name: 'Breads Cakes & Biscuits' },
    { id: 'sweets', name: 'Sweets' },
    { id: 'savory-snacks-others', name: 'Savory Snacks & Others' },
].map(cat => ({ ...cat, isActive: true, createdAt: new Date().toISOString() }));

export const getCategoryName = (id: string): string => {
    return CATEGORIES.find(c => c.id === id)?.name || 'General Product';
};