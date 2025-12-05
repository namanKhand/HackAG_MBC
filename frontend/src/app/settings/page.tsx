'use client';

import { useState, useEffect } from 'react';
import { LobbySidebar } from '@/components/LobbySidebar';
import { Settings, Volume2, Layers, Layout } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { USDC_ADDRESS } from '@/constants';
import { useSettings } from '@/context/SettingsContext';

export default function SettingsPage() {
    const { address } = useAccount();
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_ADDRESS as `0x${string}`,
    });

    const { settings, updateSetting, toggleSetting } = useSettings();
    const [pokerBalance, setPokerBalance] = useState(0);

    // Fetch Poker Balance
    useEffect(() => {
        const fetchPokerBalance = async () => {
            if (!address) return;
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${address}`);
                const data = await res.json();
                if (data.balance !== undefined) {
                    setPokerBalance(data.balance);
                }
            } catch (err) {
                console.error("Failed to fetch poker balance", err);
            }
        };
        fetchPokerBalance();
    }, [address]);

    return (
        <div className="min-h-screen bg-black text-white flex">
            <LobbySidebar
                usdcBalance={usdcBalance}
                pokerBalance={pokerBalance}
                onDeposit={() => { }}
                onCashout={() => { }}
            />

            <main className="flex-1 ml-64 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Settings className="text-gray-400" /> Settings
                        </h1>
                        <p className="text-gray-400 mt-1">Customize your poker experience</p>
                    </div>

                    <div className="space-y-8">
                        {/* Table Appearance */}
                        <section className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400">
                                <Layout size={20} /> Table Appearance
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Layers className="text-gray-400" />
                                        <div>
                                            <p className="font-bold">4-Color Deck</p>
                                            <p className="text-xs text-gray-500">Easier to distinguish suits</p>
                                        </div>
                                    </div>
                                    <Toggle checked={settings.fourColorDeck} onChange={() => toggleSetting('fourColorDeck')} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Layout className="text-gray-400" />
                                        <div>
                                            <p className="font-bold">Show Avatars</p>
                                            <p className="text-xs text-gray-500">Display player profile pictures</p>
                                        </div>
                                    </div>
                                    <Toggle checked={settings.showAvatars} onChange={() => toggleSetting('showAvatars')} />
                                </div>

                                <div className="col-span-full">
                                    <p className="text-sm font-bold text-gray-400 mb-3">Table Felt Color</p>
                                    <div className="flex gap-4">
                                        {['green', 'blue', 'red', 'black'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateSetting('tableColor', color as 'green' | 'blue' | 'red' | 'black')}
                                                className={`w-12 h-12 rounded-full border-2 transition-all ${settings.tableColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                                                    }`}
                                                style={{ backgroundColor: color === 'black' ? '#18181b' : color === 'green' ? '#15803d' : color === 'blue' ? '#1d4ed8' : '#b91c1c' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Sound */}
                        <section className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-400">
                                <Volume2 size={20} /> Sound
                            </h2>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold">Master Volume</span>
                                    <span className="font-mono text-gray-400">{settings.masterVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.masterVolume}
                                    onChange={(e) => updateSetting('masterVolume', parseInt(e.target.value))}
                                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
                                        <span className="font-bold">Sound Effects</span>
                                        <Toggle checked={settings.soundEffects} onChange={() => toggleSetting('soundEffects')} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
                                        <span className="font-bold">Turn Alert</span>
                                        <Toggle checked={settings.turnAlert} onChange={() => toggleSetting('turnAlert')} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out ${checked ? 'bg-blue-600' : 'bg-zinc-700'}`}
        >
            <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ease-in-out shadow-sm`}
                style={{ left: checked ? '28px' : '4px' }}
            />
        </button>
    );
}
