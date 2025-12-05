'use client';

import { useState } from 'react';
import { LobbySidebar } from '@/components/LobbySidebar';
import { Trophy, Flame, History, Medal } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { USDC_ADDRESS } from '@/constants';

export default function LeaderboardPage() {
    const { address } = useAccount();
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_ADDRESS as `0x${string}`,
    });

    const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all-time'>('daily');

    // Dummy Data
    const leaderboardData = [
        { rank: 1, name: '0x3a...8b2', profit: 1250, hands: 142, vpip: 28 },
        { rank: 2, name: '0x7f...9c1', profit: 890, hands: 89, vpip: 22 },
        { rank: 3, name: '0x1d...4e3', profit: 540, hands: 210, vpip: 31 },
        { rank: 4, name: '0x9c...2a1', profit: 320, hands: 56, vpip: 18 },
        { rank: 5, name: '0x4b...7d9', profit: 150, hands: 112, vpip: 25 },
    ];

    return (
        <div className="min-h-screen bg-black text-white flex">
            <LobbySidebar
                usdcBalance={usdcBalance}
                pokerBalance={0}
                onDeposit={() => { }}
                onCashout={() => { }}
            />

            <main className="flex-1 ml-64 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <Trophy className="text-yellow-400" /> Leaderboard
                            </h1>
                            <p className="text-gray-400 mt-1">Top performing players on Base Poker</p>
                        </div>

                        <div className="flex bg-zinc-900 rounded-xl p-1 border border-white/5">
                            {(['daily', 'weekly', 'all-time'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeframe(t)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${timeframe === t
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Top 3 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {leaderboardData.slice(0, 3).map((player, i) => (
                            <div key={i} className={`relative overflow-hidden rounded-2xl border p-6 flex flex-col items-center ${i === 0
                                    ? 'bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/30'
                                    : i === 1
                                        ? 'bg-gradient-to-b from-gray-400/10 to-transparent border-gray-400/30'
                                        : 'bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/30'
                                }`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4 ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : 'bg-orange-500 text-black'
                                    }`}>
                                    #{i + 1}
                                </div>
                                <h3 className="text-xl font-mono font-bold mb-1">{player.name}</h3>
                                <p className={`text-2xl font-bold mb-4 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : 'text-orange-400'
                                    }`}>
                                    +${player.profit}
                                </p>
                                <div className="flex gap-4 text-sm text-gray-400">
                                    <span>{player.hands} Hands</span>
                                    <span>{player.vpip}% VPIP</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Full List */}
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Rank</th>
                                    <th className="px-6 py-4 font-medium">Player</th>
                                    <th className="px-6 py-4 font-medium text-right">Profit</th>
                                    <th className="px-6 py-4 font-medium text-right">Hands Played</th>
                                    <th className="px-6 py-4 font-medium text-right">VPIP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {leaderboardData.map((player) => (
                                    <tr key={player.rank} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${player.rank <= 3 ? 'bg-white/10 text-white' : 'text-gray-500'
                                                }`}>
                                                {player.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-blue-400">{player.name}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-400">+${player.profit}</td>
                                        <td className="px-6 py-4 text-right text-gray-300">{player.hands}</td>
                                        <td className="px-6 py-4 text-right text-gray-300">{player.vpip}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
