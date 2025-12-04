'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    console.log("Providers component rendering");
    const [queryClient] = useState(() => new QueryClient());

    const [config] = useState(() => getDefaultConfig({
        appName: 'Base Poker',
        projectId: '7b97a0db94bb11395dfef82be865674a',
        chains: [base],
        ssr: true,
    }));

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme()}>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
