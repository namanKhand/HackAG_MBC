'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const isHome = pathname === '/';

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
            {!isHome && (
                <button
                    onClick={() => router.push('/')}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-colors border border-white/10 shadow-lg"
                >
                    Home
                </button>
            )}

            <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-colors border border-white/10 shadow-lg"
            >
                Dashboard
            </button>

            <ConnectButton />
        </div>
    );
}
