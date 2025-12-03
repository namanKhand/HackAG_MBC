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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[url('/background.png')] bg-cover bg-center bg-no-repeat text-white relative overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>

      <div className="z-10 w-full max-w-6xl flex flex-col items-center">
        <h1 className="text-7xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] text-center">
          <span className="text-red-500">Base</span> <span className="text-white">Poker</span>
        </h1>
        <p className="text-xl text-gray-300 mb-16 font-light tracking-widest uppercase">The Future of On-Chain Poker</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full px-4">
          {/* Paper Money Option (Left) */}
          <button
            onClick={() => handleModeSelect('paper')}
            className="group relative h-96 bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] border border-white/10 p-8 flex flex-col items-center justify-center hover:border-green-500/50 transition-all duration-500 hover:shadow-[0_0_60px_rgba(34,197,94,0.2)] hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="text-8xl mb-8 group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100">🎮</div>
            <h2 className="text-4xl font-bold mb-4 text-white group-hover:text-green-400 transition-colors">Paper Money</h2>
            <p className="text-gray-400 text-center text-lg max-w-xs">Practice your skills risk-free with virtual chips.</p>
            <div className="mt-8 px-8 py-3 bg-white/5 rounded-full border border-white/10 group-hover:bg-green-500/20 group-hover:border-green-500/30 transition-all">
              <span className="text-sm font-mono text-green-300">Free Play</span>
            </div>
          </button>

          {/* Real Money Option (Right) */}
          <button
            onClick={() => handleModeSelect('real')}
            className="group relative h-96 bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] border border-white/10 p-8 flex flex-col items-center justify-center hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_60px_rgba(220,38,38,0.2)] hover:-translate-y-2 overflow-hidden"
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

        {/* Wallet Status / Connect (Optional Footer) */}
        <div className="mt-16">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-500 text-sm">Connect wallet for Real Money play</p>
              <div className="flex gap-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
                  >
                    {connector.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => disconnect()}
              className="px-6 py-2 text-gray-500 hover:text-white transition-colors text-sm"
            >
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)} (Disconnect)
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
