'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Removed login redirect logic as we are now wallet-only
    // and the home page is accessible to everyone.

    return (
        <div className="flex min-h-screen bg-[url('/cyberpunk-city-bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white relative overflow-hidden">
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
            <main
                className={`flex-1 transition-all duration-300 ease-in-out p-6 ${isCollapsed ? 'ml-20' : 'ml-64'
                    }`}
            >
                {children}
            </main>
        </div>
    );
}
