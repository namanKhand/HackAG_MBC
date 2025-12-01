'use client';

import PokerTable from '@/components/PokerTable';
import { useParams, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export default function TablePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { address, isConnected } = useAccount();
    const tableId = params.id as string;

    const mode = searchParams.get('mode');
    const nameParam = searchParams.get('name');

    const [playerName, setPlayerName] = useState('');

    useEffect(() => {
        if (mode === 'real' && address) {
            setPlayerName(`${address.slice(0, 6)}...${address.slice(-4)}`);
        } else {
            setPlayerName(nameParam || 'Guest');
        }
    }, [mode, address, nameParam]);

    if (mode === 'real' && !isConnected) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Wallet Disconnected</h1>
                    <p className="mb-4">Please connect your wallet to play Real Money poker.</p>
                    <a href="/" className="text-blue-400 hover:underline">Return to Home</a>
                </div>
            </main>
        );
    }

    if (!playerName) return null; // Wait for name to be set

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
            <PokerTable tableId={tableId} playerName={playerName} />
        </main>
    );
}
