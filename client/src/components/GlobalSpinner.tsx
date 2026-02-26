'use client';

import React, { useEffect, useState } from 'react';
import { Spinner } from './ui/Spinner';

export function GlobalSpinner() {
    const [isLoading, setIsLoading] = useState(false);
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        const handleRequestStart = () => {
            setRequestCount(prev => prev + 1);
        };

        const handleRequestEnd = () => {
            setRequestCount(prev => Math.max(0, prev - 1));
        };

        globalThis.window?.addEventListener('axios-request-start', handleRequestStart);
        globalThis.window?.addEventListener('axios-request-end', handleRequestEnd);

        return () => {
            globalThis.window?.removeEventListener('axios-request-start', handleRequestStart);
            globalThis.window?.removeEventListener('axios-request-end', handleRequestEnd);
        };
    }, []);

    useEffect(() => {
        if (requestCount > 0) {
            setIsLoading(true);
        } else {
            // Small delay to prevent flickering for fast requests
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [requestCount]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <div className="bg-background p-4 rounded-xl shadow-lg border animate-in fade-in zoom-in-95 duration-200">
                <Spinner size="lg" />
            </div>
        </div>
    );
}
