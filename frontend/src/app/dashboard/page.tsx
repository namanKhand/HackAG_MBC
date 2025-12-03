'use client';

import { useAccount } from 'wagmi';

export default function Dashboard() {
    const { address } = useAccount();

    return (
        <div className="min-h-screen text-white p-8 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
            <p className="text-xl text-gray-400">Stats and History coming soon for {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'connected wallet'}.</p>
        </div>
    );
}
