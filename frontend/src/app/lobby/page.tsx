'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

const TABLES = [
    { id: 'micro', name: 'Micro Stakes', stakes: '0.1/0.2 USDC', minBuyIn: 20, maxBuyIn: 50 },
    { id: 'low', name: 'Low Stakes', stakes: '1/2 USDC', minBuyIn: 100, maxBuyIn: 200 },
    { id: 'mid', name: 'Mid Stakes', stakes: '5/10 USDC', minBuyIn: 500, maxBuyIn: 1000 },
    { id: 'high', name: 'High Stakes', stakes: '50/100 USDC', minBuyIn: 5000, maxBuyIn: 10000 },
];

import { useSearchParams } from 'next/navigation';

export default function Lobby() {
    const router = useRouter();
    const { isConnected } = useAccount();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode') || 'real';
    const [selectedTable, setSelectedTable] = useState<string | null>(null);

    const joinTable = (tableId: string) => {
        if (mode === 'real' && !isConnected) {
            alert('Please connect wallet first');
            return;
        }
        router.push(`/table/${tableId}?mode=${mode}`);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Game Lobby
                    </h1>

                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {TABLES.map((table) => (
                        <div
                            key={table.id}
                            className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:-translate-y-1 hover:shadow-xl group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                                    <span className="text-2xl">♠️</span>
                                </div>
                                <span className="text-xs font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">
                                    6-Max
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-1">{table.name}</h3>
                            <p className="text-blue-400 font-mono mb-4">{table.stakes}</p>

                            <div className="space-y-2 text-sm text-gray-400 mb-6">
                                <div className="flex justify-between">
                                    <span>Min Buy-in</span>
                                    <span className="text-white">${table.minBuyIn}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Max Buy-in</span>
                                    <span className="text-white">${table.maxBuyIn}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => joinTable(table.id)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
                            >
                                Join Table
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
