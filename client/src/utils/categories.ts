import { Category, Product } from '../types';
import { CATEGORIES } from '../constants/categories';

export const normalizeCategoryValue = (value?: string | number | null) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export const getCategoryOptions = (categories: Category[]) =>
    categories.length > 0 ? categories : CATEGORIES;

export const getCategoryName = (categories: Category[], value?: string | number | null) => {
    const normalizedValue = normalizeCategoryValue(value);
    const match = getCategoryOptions(categories).find(category =>
        category.id === value ||
        category.name === value ||
        normalizeCategoryValue(category.id) === normalizedValue ||
        normalizeCategoryValue(category.name) === normalizedValue
    );

    return match?.name || String(value || 'General Product');
};

export const getProductCategoryId = (categories: Category[], product?: Product | null) => {
    if (!product) return '';

    const options = getCategoryOptions(categories);
    const candidates = [
        product.categoryId,
        product.categoryName,
        product.category,
    ].filter(Boolean);

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeCategoryValue(candidate);
        const match = options.find(category =>
            category.id === candidate ||
            category.name === candidate ||
            normalizeCategoryValue(category.id) === normalizedCandidate ||
            normalizeCategoryValue(category.name) === normalizedCandidate
        );

        if (match) return match.id;
    }

    return String(product.categoryId || product.category || '');
};
