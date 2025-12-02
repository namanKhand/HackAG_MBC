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

    useEffect(() => {
        if (!loading && !user) {
            if (pathname !== '/login' && pathname !== '/register') {
                router.push('/login');
            }
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
    }

    if (!user && (pathname === '/login' || pathname === '/register')) {
        return <>{children}</>;
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="flex min-h-screen bg-black">
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
