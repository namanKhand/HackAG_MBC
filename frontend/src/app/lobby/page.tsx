'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import BuyInModal from '@/components/BuyInModal';
import { DepositPanel } from '@/components/DepositPanel';
import { CashoutPanel } from '@/components/CashoutPanel';
import { LobbySidebar } from '@/components/LobbySidebar';
import { TableFilters } from '@/components/TableFilters';
import { TableListItem } from '@/components/TableListItem';
import { TABLES, USDC_ADDRESS } from '@/constants';
import { Users } from 'lucide-react';

function LobbyContent() {
    const router = useRouter();
    const { isConnected, address } = useAccount();
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_ADDRESS as `0x${string}`,
    });

    // State
    const [selectedTable, setSelectedTable] = useState<typeof TABLES[0] | null>(null);
    const [isBuyInOpen, setIsBuyInOpen] = useState(false);
    const [showDeposit, setShowDeposit] = useState(false);
    const [showCashout, setShowCashout] = useState(false);
    const [pokerBalance, setPokerBalance] = useState(0);

    // Fetch Poker Balance
    const fetchPokerBalance = async () => {
        if (!address) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${address}`);
            const data = await res.json();
            if (data.balance !== undefined) {
                setPokerBalance(data.balance);
            }
        } catch (err) {
            console.error("Failed to fetch poker balance", err);
        }
    };

    // Initial Fetch
    useMemo(() => {
        fetchPokerBalance();
    }, [address]);

    // Filter State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStakes, setSelectedStakes] = useState('all');

    const handleJoinClick = (table: typeof TABLES[0]) => {
        if (!isConnected) {
            alert('Please connect wallet first');
            return;
        }
        setSelectedTable(table);
        setIsBuyInOpen(true);
    };

    const handleBuyInSuccess = (amount: number, txHash: string) => {
        setIsBuyInOpen(false);
        fetchPokerBalance(); // Refresh balance after buy-in
        if (selectedTable) {
            router.push(`/table/${selectedTable.id}?mode=real&buyIn=${amount}&tx=${txHash}`);
        }
    };

    // Filter Logic
    const filteredTables = useMemo(() => {
        return TABLES.filter(table => {
            const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase());

            let matchesStakes = true;
            if (selectedStakes !== 'all') {
                // Simple heuristic for stakes mapping
                const stakesVal = parseFloat(table.stakes.split('/')[1]); // e.g. "0.2" from "0.1/0.2"
                if (selectedStakes === 'micro') matchesStakes = stakesVal <= 0.5;
                else if (selectedStakes === 'low') matchesStakes = stakesVal > 0.5 && stakesVal <= 2;
                else if (selectedStakes === 'mid') matchesStakes = stakesVal > 2 && stakesVal <= 10;
                else if (selectedStakes === 'high') matchesStakes = stakesVal > 10;
            }

            return matchesSearch && matchesStakes;
        });
    }, [searchQuery, selectedStakes]);

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Sidebar */}
            <LobbySidebar
                usdcBalance={usdcBalance}
                pokerBalance={pokerBalance}
                onDeposit={() => setShowDeposit(true)}
                onCashout={() => setShowCashout(true)}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-900/50 to-blue-600/30 border border-blue-500/20 p-6 rounded-2xl">
                            <h3 className="text-blue-400 text-sm font-bold mb-1">Active Players</h3>
                            <p className="text-3xl font-mono font-bold text-white">-</p>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-gray-400 text-sm font-bold mb-1">Total Tables</h3>
                            <p className="text-3xl font-mono font-bold text-white">{TABLES.length}</p>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-gray-400 text-sm font-bold mb-1">Jackpot</h3>
                            <p className="text-3xl font-mono font-bold text-yellow-400">$0</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <TableFilters
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        selectedStakes={selectedStakes}
                        onStakesChange={setSelectedStakes}
                    />

                    {/* Tables List/Grid */}
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            {filteredTables.map((table) => (
                                <div
                                    key={table.id}
                                    className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors text-blue-400">
                                                <span className="text-2xl">♠️</span>
                                            </div>
                                            <span className="text-xs font-mono text-gray-400 bg-black/40 px-2 py-1 rounded border border-white/5">
                                                6-Max
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold mb-1 text-white">{table.name}</h3>
                                        <p className="text-blue-400 font-mono mb-6 text-lg">{table.stakes}</p>

                                        <div className="space-y-3 text-sm text-gray-400 mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
                                            <div className="flex justify-between">
                                                <span>Min Buy-in</span>
                                                <span className="text-white font-mono">${table.minBuyIn}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Max Buy-in</span>
                                                <span className="text-white font-mono">${table.maxBuyIn}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-white/5">
                                                <span>Players</span>
                                                <span className="flex items-center gap-1 text-white">
                                                    <Users size={14} /> 0/6
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleJoinClick(table)}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 group-hover:shadow-blue-500/20"
                                        >
                                            Join Table
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filteredTables.map((table) => (
                                <TableListItem
                                    key={table.id}
                                    table={table}
                                    onJoin={() => handleJoinClick(table)}
                                />
                            ))}
                        </div>
                    )}

                    {filteredTables.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            <p>No tables found matching your filters.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {selectedTable && (
                <BuyInModal
                    isOpen={isBuyInOpen}
                    onClose={() => setIsBuyInOpen(false)}
                    onSuccess={handleBuyInSuccess}
                    minBuyIn={selectedTable.minBuyIn}
                    maxBuyIn={selectedTable.maxBuyIn}
                    userAddress={address}
                />
            )}

            {showDeposit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowDeposit(false)}
                            className="absolute -top-10 right-0 text-gray-400 hover:text-white"
                        >
                            Close ✕
                        </button>
                        <DepositPanel onSuccess={fetchPokerBalance} />
                    </div>
                </div>
            )}

            {showCashout && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowCashout(false)}
                            className="absolute -top-10 right-0 text-gray-400 hover:text-white"
                        >
                            Close ✕
                        </button>
                        <CashoutPanel onSuccess={fetchPokerBalance} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Lobby() {
    return (
        <Suspense fallback={<div className="min-h-screen text-white flex items-center justify-center bg-black">Loading Lobby...</div>}>
            <LobbyContent />
        </Suspense>
    );
}
