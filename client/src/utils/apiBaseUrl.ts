const LOCALHOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const getApiBaseUrl = (): string => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (envUrl) {
        return envUrl.replace(/\/+$/, '');
    }

    if (typeof globalThis.window !== 'undefined') {
        const { hostname } = globalThis.window.location;
        if (LOCALHOSTS.has(hostname)) {
            return 'http://localhost:3001';
        }

        // In deployed environments, prefer same-origin so reverse proxies/rewrites work.
        return '';
    }

    // SSR fallback
    return 'http://localhost:3001';
};
