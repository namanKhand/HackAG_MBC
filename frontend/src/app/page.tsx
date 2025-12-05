'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const router = useRouter();
  const [showPoker, setShowPoker] = useState(false);
  const [moveUp, setMoveUp] = useState(false);

  useEffect(() => {
    if (isConnected) {
      router.push('/lobby');
    }
  }, [isConnected, router]);

  useEffect(() => {
    // Sequence:
    // 0ms: "Base" fades in (handled by CSS)
    // 800ms: "Poker" fades in
    // 2000ms: Title moves up, Options fade in
    const pokerTimer = setTimeout(() => {
      setShowPoker(true);
    }, 800);

    const moveTimer = setTimeout(() => {
      setMoveUp(true);
    }, 2000);

    return () => {
      clearTimeout(pokerTimer);
      clearTimeout(moveTimer);
    };
  }, []);

  // Wallet Icons Map
  const WALLET_ICONS: Record<string, string> = {
    'MetaMask': 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    'Coinbase Wallet': 'https://avatars.githubusercontent.com/u/18060234?s=200&v=4',
    'Rainbow': 'https://avatars.githubusercontent.com/u/48327834?s=200&v=4',
    'WalletConnect': 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
  };

  // Wallets to display
  const displayWallets = [
    { name: 'MetaMask', id: 'metaMask' },
    { name: 'Rainbow', id: 'rainbow' },
    { name: 'Base Account', id: 'baseAccount' } // ID from debug info
  ];

  const getWallet = (id: string) => {
    return connectors.find(c => c.id === id || c.name === id);
  };

  const handleConnect = async (wallet: { name: string, id: string }) => {
    try {
      // Try to find specific connector first
      let connector = getWallet(wallet.id);

      // Special handling for Base Account / Coinbase
      if (!connector && wallet.id === 'baseAccount') {
        connector = connectors.find(c => c.id === 'coinbaseWalletSDK');
      }

      // Special handling for MetaMask (might be 'injected')
      if (!connector && wallet.id === 'metaMask') {
        connector = connectors.find(c => c.id === 'injected' && c.name === 'MetaMask');
      }

      if (connector) {
        connect({ connector });
      } else {
        // Fallback to WalletConnect
        const wcConnector = connectors.find(c => c.id === 'walletConnect');
        if (wcConnector) {
          console.log('Falling back to WalletConnect for', wallet.name);
          connect({ connector: wcConnector });
        } else {
          alert('Wallet connector not found. Please install the wallet extension.');
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black relative overflow-hidden">
      <div className={`z-10 flex flex-col items-center transition-all duration-1000 ease-in-out ${moveUp ? '-translate-y-32' : 'translate-y-0'}`}>
        <h1 className="text-8xl font-bold mb-12 tracking-tighter">
          <span className="text-blue-600 animate-fade-in inline-block">Base</span>
          <span className={`text-white ml-4 transition-opacity duration-1000 ${showPoker ? 'opacity-100' : 'opacity-0'} inline-block`}>
            Poker
          </span>
        </h1>

        <div className={`transition-all duration-1000 ${moveUp ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'} flex flex-col items-center gap-8 w-full max-w-4xl`}>
          <h2 className="text-2xl font-bold text-white">Connect a Wallet</h2>

          <div className="flex flex-wrap justify-center gap-6 w-full">
            {displayWallets.map(wallet => {
              const connector = getWallet(wallet.id);
              // Map 'Base Account' back to 'Coinbase Wallet' for icon lookup if needed, or just use name
              const iconKey = wallet.name === 'Base Account' ? 'Coinbase Wallet' : wallet.name;
              const iconUrl = WALLET_ICONS[iconKey] || connector?.icon;

              return (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet)}
                  className="relative group flex flex-col items-center justify-center w-40 h-40 bg-zinc-900/50 hover:bg-zinc-800 backdrop-blur-md border border-white/5 hover:border-blue-500/50 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)]"
                >
                  {iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconUrl} alt={wallet.name} className="w-16 h-16 mb-4 rounded-xl group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="w-16 h-16 mb-4 bg-zinc-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl">🔗</span>
                    </div>
                  )}
                  <span className="text-white font-bold text-sm tracking-wide">{wallet.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
