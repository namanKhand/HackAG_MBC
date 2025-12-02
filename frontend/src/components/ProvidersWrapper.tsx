'use client';

import { Providers } from '../app/providers';
import ErrorBoundary from './ErrorBoundary';
import { useState, useEffect, ReactNode } from 'react';

export function ProvidersWrapper({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading Providers...</div>;
    }

    return (
        <ErrorBoundary>
            <Providers>{children}</Providers>
        </ErrorBoundary>
    );
}
