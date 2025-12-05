'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LayoutDashboard, ChevronLeft, ChevronRight, LogOut, User, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccount, useBalance } from 'wagmi';
import { USDC_ADDRESS } from '../constants';
import { CashoutPanel } from './CashoutPanel';
import { DepositPanel } from './DepositPanel';

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { address } = useAccount();
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_ADDRESS as `0x${string}`,
    });
    const [showCashout, setShowCashout] = useState(false);
    const [showDeposit, setShowDeposit] = useState(false);
    const [chipsBalance, setChipsBalance] = useState<number>(0);

    // Fetch Chips Balance
    useEffect(() => {
        const fetchBalance = () => {
            if (address) {
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${address}`)
                    .then(res => res.json())
                    .then(data => setChipsBalance(data.balance || 0))
                    .catch(err => console.error("Failed to fetch account balance", err));
            } else {
                setChipsBalance(0);
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 10000); // Poll every 10s

        return () => clearInterval(interval);
    }, [address]);

    // Auto-link Wallet
    const { token, refreshUser } = useAuth();
    useEffect(() => {
        const linkWallet = async () => {
            if (address && user && token && !user.wallets?.includes(address)) {
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
                        console.log('Wallet auto-linked successfully');
                    }
                } catch (e) {
                    console.error('Error auto-linking wallet:', e);
                }
            }
        };
        linkWallet();
    }, [address, user, token, refreshUser]);

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ];

    return (
        <div
            className={`fixed left-0 top-0 h-screen bg-black/30 backdrop-blur-md border-r border-white/10 transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-8 bg-zinc-800 text-gray-400 hover:text-white rounded-full p-1 border border-white/10 shadow-lg transition-colors z-50"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Logo Area */}
            <div className="h-20 flex items-center justify-center border-b border-white/5">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/20">
                    P
                </div>
                {!isCollapsed && (
                    <span className="ml-3 text-xl font-bold text-white tracking-wider animate-fade-in">
                        POKER
                    </span>
                )}
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-white/5">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-blue-400">
                        <User size={16} />
                    </div>
                    {!isCollapsed && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.isGuest ? 'Guest' : 'Connected'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${isActive
                                ? 'bg-blue-600/10 text-blue-400'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon size={24} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {!isCollapsed && (
                                <span className="ml-3 font-medium animate-fade-in whitespace-nowrap">
                                    {item.name}
                                </span>
                            )}
                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                                    {item.name}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Wallet Connection & Logout */}
            <div className="p-4 border-t border-white/10 bg-transparent space-y-4">
                {/* Game Chips Balance */}
                {address && (
                    <div className={`bg-zinc-800/50 rounded-xl p-3 border border-white/5 ${isCollapsed ? 'hidden' : ''}`}>
                        <p className="text-xs text-gray-400 mb-1">Game Chips</p>
                        <p className="text-xl font-bold text-green-400 font-mono">
                            {chipsBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                )}

                {/* Deposit Button */}
                {!isCollapsed && (
                    <button
                        onClick={() => setShowDeposit(true)}
                        className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        <Wallet size={18} />
                        <span>Deposit Funds</span>
                    </button>
                )}
                {isCollapsed && (
                    <button
                        onClick={() => setShowDeposit(true)}
                        className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 py-2 rounded-xl transition-colors flex items-center justify-center"
                    >
                        <Wallet size={18} />
                    </button>
                )}

                {/* Cashout Button */}
                {!isCollapsed && (
                    <button
                        onClick={() => setShowCashout(true)}
                        className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        <LogOut size={18} />
                        <span>Cashout Chips</span>
                    </button>
                )}
                {isCollapsed && (
                    <button
                        onClick={() => setShowCashout(true)}
                        className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 py-2 rounded-xl transition-colors flex items-center justify-center"
                    >
                        <LogOut size={18} />
                    </button>
                )}

                <div className={`transition-all duration-300 ${isCollapsed ? 'scale-75 origin-center -ml-1' : ''}`}>
                    <ConnectButton.Custom>
                        {({
                            account,
                            chain,
                            openAccountModal,
                            openChainModal,
                            openConnectModal,
                            authenticationStatus,
                            mounted,
                        }) => {
                            const ready = mounted && authenticationStatus !== 'loading';
                            const connected =
                                ready &&
                                account &&
                                chain &&
                                (!authenticationStatus ||
                                    authenticationStatus === 'authenticated');

                            return (
                                <div
                                    {...(!ready && {
                                        'aria-hidden': true,
                                        'style': {
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                        },
                                    })}
                                >
                                    {(() => {
                                        if (!connected) {
                                            return (
                                                <button
                                                    onClick={openConnectModal}
                                                    type="button"
                                                    className={`bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl transition-colors w-full ${isCollapsed ? 'text-xs px-1' : ''}`}
                                                >
                                                    {isCollapsed ? 'Conn' : 'Connect Wallet'}
                                                </button>
                                            );
                                        }

                                        if (chain.unsupported) {
                                            return (
                                                <button
                                                    onClick={openChainModal}
                                                    type="button"
                                                    className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 rounded-xl transition-colors w-full"
                                                >
                                                    Wrong network
                                                </button>
                                            );
                                        }

                                        return (
                                            <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                                                {!isCollapsed && (
                                                    <button
                                                        onClick={openChainModal}
                                                        className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl transition-colors"
                                                    >
                                                        {chain.hasIcon && (
                                                            <div
                                                                style={{
                                                                    background: chain.iconBackground,
                                                                    width: 12,
                                                                    height: 12,
                                                                    borderRadius: 999,
                                                                    overflow: 'hidden',
                                                                }}
                                                            >
                                                                {chain.iconUrl && (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        alt={chain.name ?? 'Chain icon'}
                                                                        src={chain.iconUrl}
                                                                        style={{ width: 12, height: 12 }}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={openAccountModal}
                                                    className={`bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl transition-colors flex items-center gap-2 ${isCollapsed ? 'w-full justify-center' : 'flex-1'}`}
                                                >
                                                    {!isCollapsed && (
                                                        <span className="text-sm font-mono text-gray-300">
                                                            {usdcBalance ? `${Number(usdcBalance.formatted).toFixed(2)} USDC` : account.displayBalance}
                                                        </span>
                                                    )}
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-xs font-bold">
                                                        {account.displayName ? account.displayName[0] : 'U'}
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        }}
                    </ConnectButton.Custom>
                </div>

            </div>

            {/* Cashout Modal Overlay */}
            {showCashout && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowCashout(false)}
                            className="absolute -top-10 right-0 text-gray-400 hover:text-white"
                        >
                            Close ✕
                        </button>
                        <CashoutPanel />
                    </div>
                </div>
            )}

            {/* Deposit Modal Overlay */}
            {showDeposit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowDeposit(false)}
                            className="absolute -top-10 right-0 text-gray-400 hover:text-white"
                        >
                            Close ✕
                        </button>
                        <DepositPanel />
                    </div>
                </div>
            )}
        </div>
    );
}
