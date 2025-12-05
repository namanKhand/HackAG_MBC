'use client';

import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function Dashboard() {
    const { address, isConnected } = useAccount();
    const { user, token, refreshUser } = useAuth();
    const router = useRouter();
    const [linking, setLinking] = useState(false);
    const [linking, setLinking] = useState(false);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['accountStats', user?.id],
        queryFn: async () => {
            if (!token) return null;
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/account/stats?mode=real`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!token
    });

    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ['accountHistory', user?.id],
        queryFn: async () => {
            if (!token) return [];
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/account/history?mode=real`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!token
    });

    const linkWallet = async () => {
        if (!address || !token) return;
        setLinking(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/account/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ address })
            });
            if (res.ok) {
                await refreshUser();
                alert('Wallet linked successfully!');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to link wallet');
            }
        } catch (e) {
            alert('Error linking wallet');
        } finally {
            setLinking(false);
        }
    };

    const calculateStat = (count: number, opp: number) => {
        if (!opp || opp === 0) return '0%';
        return `${((count / opp) * 100).toFixed(1)}%`;
    };

    const isWalletLinked = user?.wallets?.includes(address || '');

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                        <p className="font-mono text-gray-400">Welcome, {user?.username}</p>
                    </div>
            </div>
        </header>

                {/* Wallet Linking Section */ }
    <div className="bg-gray-800/30 border border-gray-700 p-6 rounded-2xl mb-12 flex items-center justify-between">
        <div>
            <h3 className="text-xl font-bold mb-2">Connected Wallets</h3>
            <div className="flex gap-2 flex-wrap">
                {user?.wallets && user.wallets.length > 0 ? (
                    user.wallets.map(w => (
                        <span key={w} className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-sm font-mono border border-blue-800">
                            {w.slice(0, 6)}...{w.slice(-4)}
                        </span>
                    ))
                ) : (
                    <p className="text-gray-500">No wallets linked yet.</p>
                )}
            </div>
        </div>
        <div>
            {isConnected ? (
                !isWalletLinked ? (
                    <button
                        onClick={linkWallet}
                        disabled={linking}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition disabled:opacity-50"
                    >
                        {linking ? 'Linking...' : 'Link Current Wallet'}
                    </button>
                ) : (
                    <span className="text-green-400 font-medium flex items-center">
                        ✓ Current Wallet Linked
                    </span>
                )
            ) : (
                <p className="text-yellow-400 text-sm">Connect wallet to link it</p>
            )}
        </div>
    </div>
                </div >

        {/* Stats Grid */ }
        < div className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" >
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">Hands Played</h3>
                        <p className="text-3xl font-bold">{stats?.hands_played || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">Total Winnings</h3>
                        <p className="text-3xl font-bold text-blue-400">
                            {stats?.chips_won || 0} <span className="text-sm text-gray-500">USDC</span>
                        </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">VPIP</h3>
                        <p className="text-3xl font-bold text-yellow-400">
                            {calculateStat(stats?.vpip_count, stats?.vpip_opportunity)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">PFR</h3>
                        <p className="text-3xl font-bold text-blue-400">
                            {calculateStat(stats?.pfr_count, stats?.pfr_opportunity)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
                        <h3 className="text-gray-400 text-sm mb-1">3-Bet</h3>
                        <p className="text-3xl font-bold text-purple-400">
                            {calculateStat(stats?.three_bet_count, stats?.three_bet_opportunity)}
                        </p>
                    </div>
                </div >

        {/* Game History */ }
        < div className = "bg-gray-800/50 border border-gray-700 rounded-2xl p-8" >
                    <h2 className="text-2xl font-bold mb-6">Hand History</h2>
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
                </div >
            </div >
        </div >
    );
}
