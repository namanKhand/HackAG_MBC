'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [name, setName] = useState('');
  const [gameMode, setGameMode] = useState<'play' | 'real' | null>(null);

  const joinTable = (tableId: string) => {
    if (gameMode === 'play') {
      if (!name) {
        alert('Please enter a name');
        return;
      }
      router.push(`/table/${tableId}?name=${name}&mode=play`);
    } else {
      if (!isConnected) {
        alert('Please connect wallet');
        return;
      }
      router.push(`/table/${tableId}?mode=real`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[url('/background.png')] bg-cover bg-center bg-no-repeat text-white relative overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center animate-fade-in">
        <h1 className="text-7xl font-bold mb-4 bg-gradient-to-r from-red-500 via-white to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] text-center">
          Base Poker
        </h1>
        <p className="text-xl text-gray-300 mb-12 font-light tracking-widest uppercase">The Future of On-Chain Poker</p>

        {!gameMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Play Money Card */}
            <button
              onClick={() => setGameMode('play')}
              className="group relative h-80 bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(220,38,38,0.2)] hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🃏</div>
              <h2 className="text-3xl font-bold mb-2 text-white group-hover:text-red-400 transition-colors">Play Money</h2>
              <p className="text-gray-400 text-center">Practice your skills with free chips. No wallet required.</p>
            </button>

            {/* Real Money Card */}
            <button
              onClick={() => setGameMode('real')}
              className="group relative h-80 bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(59,130,246,0.2)] hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">💰</div>
              <h2 className="text-3xl font-bold mb-2 text-white group-hover:text-blue-400 transition-colors">Real Money</h2>
              <p className="text-gray-400 text-center">Play with USDC on Base. Connect wallet to join.</p>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md bg-black/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl animate-scale-up">
            <button
              onClick={() => setGameMode(null)}
              className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              ← Back to Modes
            </button>

            {gameMode === 'play' ? (
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-red-500 mb-2">Play Money Mode</h2>
                  <p className="text-gray-400 text-sm">Enter a display name to sit at the table.</p>
                </div>
                <input
                  type="text"
                  placeholder="Enter Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-lg text-center"
                />
                <button
                  onClick={() => joinTable('default')}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg transition-all transform active:scale-95"
                >
                  Join Table
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-blue-500 mb-2">Real Money Mode</h2>
                  <p className="text-gray-400 text-sm">Connect your wallet to play with USDC.</p>
                </div>

                {!isConnected ? (
                  <div className="flex flex-col gap-3">
                    {connectors.map((connector) => (
                      <button
                        key={connector.uid}
                        onClick={() => connect({ connector })}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                        Connect {connector.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-xl text-center">
                      <p className="text-sm text-gray-400 mb-1">Connected as</p>
                      <p className="font-mono text-blue-300 truncate">{address}</p>
                    </div>
                    <button
                      onClick={() => joinTable('default')}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg transition-all transform active:scale-95"
                    >
                      Join Table
                    </button>
                    <button
                      onClick={() => disconnect()}
                      className="text-sm text-red-400 hover:text-red-300 underline"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
