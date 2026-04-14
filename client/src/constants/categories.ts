import { Category } from '../types';

export const CATEGORIES: Category[] = [
    { id: 'milk', name: 'Milk' },
    { id: 'curd', name: 'Curd' },
    { id: 'ghee', name: 'Ghee' },
    { id: 'breads', name: 'Breads' },
    { id: 'sweets', name: 'Sweets' },
    { id: 'products', name: 'General Product' }
];

export const getCategoryName = (id: string): string => {
    return CATEGORIES.find(c => c.id === id)?.name || 'General Product';
};
