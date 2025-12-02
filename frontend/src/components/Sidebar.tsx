'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ];

    return (
        <div
            className={`fixed left-0 top-0 h-screen bg-zinc-950 border-r border-white/5 transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
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

            {/* Wallet Connection */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/50">
                <div className={`transition-all duration-300 ${isCollapsed ? 'scale-75 origin-center -ml-1' : ''}`}>
                    <ConnectButton
                        showBalance={!isCollapsed}
                        accountStatus={isCollapsed ? "avatar" : "full"}
                        chainStatus={isCollapsed ? "none" : "full"}
                    />
                </div>
            </div>
        </div>
    );
}
