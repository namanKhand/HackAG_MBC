'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import BuyInModal from '@/components/BuyInModal';

import { TABLES } from '@/constants';

export default function Lobby() {
    const router = useRouter();
    const { isConnected } = useAccount();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode') || 'real';

    const [selectedTable, setSelectedTable] = useState<typeof TABLES[0] | null>(null);
    const [isBuyInOpen, setIsBuyInOpen] = useState(false);

    const handleJoinClick = (table: typeof TABLES[0]) => {
        if (mode === 'real') {
            if (!isConnected) {
                alert('Please connect wallet first');
                return;
            }
            setSelectedTable(table);
            setIsBuyInOpen(true);
        } else {
            // Paper money - just join
            router.push(`/table/${table.id}?mode=paper`);
        }
    };

    const handleBuyInSuccess = (amount: number, txHash: string) => {
        setIsBuyInOpen(false);
        if (selectedTable) {
            // Pass buy-in info via URL params or let backend handle it via socket later
            // For now, we'll pass it in URL so the Table page knows to emit it
            router.push(`/table/${selectedTable.id}?mode=real&buyIn=${amount}&tx=${txHash}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center gap-4 mb-12">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-white/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
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
                                onClick={() => handleJoinClick(table)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
                            >
                                Join Table
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {selectedTable && (
                <BuyInModal
                    isOpen={isBuyInOpen}
                    onClose={() => setIsBuyInOpen(false)}
                    onSuccess={handleBuyInSuccess}
                    minBuyIn={selectedTable.minBuyIn}
                    maxBuyIn={selectedTable.maxBuyIn}
                />
            )}
        </div>
    );
}
