'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const handleModeSelect = (mode: 'paper' | 'real') => {
    if (mode === 'real' && !isConnected) {
      // If real money and not connected, maybe show connect options or just redirect to lobby where it will prompt
      // For now, let's redirect to lobby with mode=real, and lobby can handle connection prompt
      router.push('/lobby?mode=real');
    } else {
      router.push(`/lobby?mode=${mode}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Overlay - Removed specific background */}

      <div className="z-10 w-full max-w-6xl flex flex-col items-center">
        <h1 className="text-7xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] text-center">
          <span className="text-red-500">Base</span> <span className="text-white">Poker</span>
        </h1>
        <p className="text-xl text-gray-300 mb-16 font-light tracking-widest uppercase">The Future of On-Chain Poker</p>

        <div className="flex justify-center w-full px-4">
          {/* Real Money Option (Centered) */}
          <button
            onClick={() => handleModeSelect('real')}
            className="group relative h-96 w-full max-w-2xl bg-black/30 backdrop-blur-sm rounded-[2.5rem] border border-white/10 p-8 flex flex-col items-center justify-center hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_60px_rgba(220,38,38,0.2)] hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="text-8xl mb-8 group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl">💰</div>
            <h2 className="text-4xl font-bold mb-4 text-white group-hover:text-red-400 transition-colors">Real Money</h2>
            <p className="text-gray-400 text-center text-lg max-w-xs">Play with USDC on Base. High stakes, high rewards.</p>
            <div className="mt-8 px-8 py-3 bg-white/5 rounded-full border border-white/10 group-hover:bg-red-500/20 group-hover:border-red-500/30 transition-all">
              <span className="text-sm font-mono text-red-300">USDC • Base</span>
            </div>
          </button>
        </div>

        {/* Wallet Status / Connect (Optional Footer) - Removed per user request */}
      </div>
    </main>
  );
}
