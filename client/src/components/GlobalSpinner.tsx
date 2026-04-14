'use client';

import React, { useEffect, useState } from 'react';
import { Spinner } from './ui/Spinner';

export function GlobalSpinner() {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        let requestCount = 0;

        const handleRequestStart = () => {
            requestCount++;
            if (requestCount > 0) {
                clearTimeout(timer);
                setIsLoading(true);
            }
        };

        const handleRequestEnd = () => {
            requestCount = Math.max(0, requestCount - 1);
            if (requestCount === 0) {
                timer = setTimeout(() => {
                    setIsLoading(false);
                }, 200);
            }
        };

        globalThis.window?.addEventListener('axios-request-start', handleRequestStart);
        globalThis.window?.addEventListener('axios-request-end', handleRequestEnd);

        return () => {
            globalThis.window?.removeEventListener('axios-request-start', handleRequestStart);
            globalThis.window?.removeEventListener('axios-request-end', handleRequestEnd);
            clearTimeout(timer);
        };
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <div className="bg-background p-4 rounded-xl shadow-lg border animate-in fade-in zoom-in-95 duration-200">
                <Spinner size="lg" />
            </div>
        </div>
    );
}
