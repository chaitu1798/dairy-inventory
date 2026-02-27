'use client';

import React, { useEffect, useState } from 'react';
import { Spinner } from './ui/Spinner';

export function GlobalSpinner() {
    const [requestCount, setRequestCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const handleRequestStart = () => {
            setRequestCount(prev => {
                const next = prev + 1;
                if (next > 0) {
                    clearTimeout(timer);
                    setIsLoading(true);
                }
                return next;
            });
        };

        const handleRequestEnd = () => {
            setRequestCount(prev => {
                const next = Math.max(0, prev - 1);
                if (next === 0) {
                    timer = setTimeout(() => {
                        setIsLoading(false);
                    }, 200);
                }
                return next;
            });
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
