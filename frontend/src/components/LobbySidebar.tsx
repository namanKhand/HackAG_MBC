import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, LogOut, LayoutDashboard, Trophy, User, Settings } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LobbySidebarProps {
    usdcBalance?: { formatted: string };
    pokerBalance?: number;
    onDeposit: () => void;
    onCashout: () => void;
}

export function LobbySidebar({ usdcBalance, pokerBalance = 0, onDeposit, onCashout }: LobbySidebarProps) {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const pathname = usePathname();

    const navItems = [
        { name: 'Lobby', icon: LayoutDashboard, href: '/lobby' },
        { name: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
        { name: 'Settings', icon: Settings, href: '/settings' },
    ];

    return (
        <aside className="w-64 bg-zinc-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="p-6 border-b border-white/5">
                <h1 className="text-2xl font-bold tracking-tight">
                    <span className="text-blue-500">Base</span> Poker
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="space-y-4">
                    {/* Poker Balance Card */}
                    <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-500/20">
                        <p className="text-xs text-blue-400 mb-1">Poker Balance</p>
                        <p className="text-xl font-mono font-bold text-white">
                            {isConnected ? `$${pokerBalance.toFixed(2)}` : '$0.00'}
                        </p>
                        <p className="text-xs text-blue-400/60 mt-1">Chips</p>
                    </div>

                    {/* Wallet Balance Card */}
                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
                        <p className="text-xl font-mono font-bold text-white">
                            {isConnected && usdcBalance ? `$${Number(usdcBalance.formatted).toFixed(2)}` : '$0.00'}
                        </p>
                        <p className="text-xs text-gray-500/60 mt-1">USDC</p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onDeposit}
                            disabled={!isConnected}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${isConnected
                                ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/20'
                                : 'bg-zinc-800/50 text-gray-500 border-white/5 cursor-not-allowed'}`}
                        >
                            <Wallet size={18} className="mb-1" />
                            <span className="text-xs font-bold">Deposit</span>
                        </button>
                        <button
                            onClick={onCashout}
                            disabled={!isConnected}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${isConnected
                                ? 'bg-green-600/10 hover:bg-green-600/20 text-green-400 border-green-500/20'
                                : 'bg-zinc-800/50 text-gray-500 border-white/5 cursor-not-allowed'}`}
                        >
                            <LogOut size={18} className="mb-1" />
                            <span className="text-xs font-bold">Cashout</span>
                        </button>
                    </div>

                    {/* User Info or Connect Button */}
                    {isConnected ? (
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                    {address?.slice(0, 2)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">Connected as</span>
                                    <span className="text-sm font-mono text-white truncate w-24">
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => disconnect()}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                                title="Disconnect"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="pt-2">
                            {/* We need to trigger the wallet connection modal. 
                                Since we are inside the sidebar, we might not have direct access to openConnectModal from here 
                                unless we wrap it or pass it down. 
                                However, we can use the standard ConnectButton from RainbowKit but styled custom 
                                OR just redirect to home page where connection happens? 
                                User asked for "Connect Wallet button". 
                                Let's try to use the ConnectButton.Custom again or just a simple button that redirects to / if that's the flow, 
                                BUT the user is already in /lobby. 
                                Let's import ConnectButton from rainbowkit.
                            */}
                            <ConnectButton.Custom>
                                {({ openConnectModal }) => (
                                    <button
                                        onClick={openConnectModal}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
                                    >
                                        Connect Wallet
                                    </button>
                                )}
                            </ConnectButton.Custom>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
