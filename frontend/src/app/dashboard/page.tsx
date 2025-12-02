'use client';

import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const { address, isConnected } = useAccount();
    const router = useRouter();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['userStats', address],
        queryFn: async () => {
            if (!address) return null;
            const res = await fetch(`http://localhost:3001/api/user/${address}`);
            return res.json();
        },
        enabled: !!address
    });

    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ['userHistory', address],
        queryFn: async () => {
            if (!address) return null;
            const res = await fetch(`http://localhost:3001/api/history/${address}`);
            return res.json();
        },
        enabled: !!address
    });

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Please Connect Wallet</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const calculateStat = (count: number, opp: number) => {
        if (!opp || opp === 0) return '0%';
        return `${((count / opp) * 100).toFixed(1)}%`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                        <p className="font-mono text-gray-400">{address}</p>
                    </div>

                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">Hands Played</h3>
                        <p className="text-3xl font-bold">{stats?.hands_played || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">Total Winnings</h3>
                        <p className="text-3xl font-bold text-green-400">
                            {stats?.chips_won || 0} <span className="text-sm text-gray-500">Chips</span>
                        </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">VPIP (Voluntarily Put In Pot)</h3>
                        <p className="text-3xl font-bold text-yellow-400">
                            {calculateStat(stats?.vpip_count, stats?.vpip_opportunity)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">PFR (Pre-Flop Raise)</h3>
                        <p className="text-3xl font-bold text-blue-400">
                            {calculateStat(stats?.pfr_count, stats?.pfr_opportunity)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">3-Bet %</h3>
                        <p className="text-3xl font-bold text-purple-400">
                            {calculateStat(stats?.three_bet_count, stats?.three_bet_opportunity)}
                        </p>
                    </div>
                </div>

                {/* Game History */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-6">Hand History (PnL Ledger)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                    <th className="pb-4">Time</th>
                                    <th className="pb-4">Hand</th>
                                    <th className="pb-4">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {history?.map((game: { id: string; timestamp: string; net_profit: number; hand_description: string }, i: number) => (
                                    <tr key={game.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 text-gray-400">
                                            {new Date(game.timestamp).toLocaleString()}
                                        </td>
                                        <td className="py-4 font-medium text-white">
                                            {game.hand_description}
                                        </td>
                                        <td className={`py-4 font-mono font-bold ${game.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {game.net_profit >= 0 ? '+' : ''}{game.net_profit}
                                        </td>
                                    </tr>
                                ))}
                                {(!history || history.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-gray-500">
                                            No games played yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
