'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const Providers = dynamic(() => import('../app/providers').then(mod => mod.Providers), {
    ssr: false,
});

export function ProvidersWrapper({ children }: { children: ReactNode }) {
    return <Providers>{children}</Providers>;
}
