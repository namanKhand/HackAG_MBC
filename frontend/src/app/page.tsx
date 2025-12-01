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

  const joinTable = (tableId: string) => {
    if (!name && !isConnected) {
      alert('Please enter a name or connect wallet');
      return;
    }
    router.push(`/table/${tableId}?name=${name}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-slate-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Base Poker</h1>

      <div className="mb-8 p-4 bg-slate-800 rounded-lg">
        {!isConnected ? (
          <div className="flex gap-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 items-center">
            <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <button onClick={() => disconnect()} className="bg-red-600 px-4 py-2 rounded">Disconnect</button>
          </div>
        )}
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Enter Display Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 rounded text-black mr-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-2xl">
        <div className="bg-slate-800 p-6 rounded-lg flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Default Table</h2>
            <p className="text-gray-400">Stakes: 10/20 Chips</p>
          </div>
          <button
            onClick={() => joinTable('default')}
            className="bg-green-600 px-6 py-2 rounded font-bold hover:bg-green-700"
          >
            Join Table
          </button>
        </div>
      </div>
    </main>
  );
}
