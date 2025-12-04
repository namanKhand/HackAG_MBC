import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface CashoutPanelProps {
    className?: string;
}

export const CashoutPanel: React.FC<CashoutPanelProps> = ({ className }) => {
    const { address } = useAccount();
    const [balance, setBalance] = useState<number>(0);
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchBalance = React.useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${address}`);
            const data = await res.json();
            if (data.balance !== undefined) {
                setBalance(data.balance);
            }
        } catch (err) {
            console.error("Failed to fetch balance", err);
        }
    }, [address]);

    useEffect(() => {
        fetchBalance();
        const interval = setInterval(fetchBalance, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [address, fetchBalance]);

    const handleCashout = async () => {
        if (!address || !amount) return;
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0 || val > balance) {
            setMessage({ type: 'error', text: "Invalid amount" });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cashout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, amount: val })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setMessage({ type: 'success', text: `Successfully cashed out ${val} chips!` });
                setBalance(data.newBalance);
                setAmount('');
            } else {
                setMessage({ type: 'error', text: data.error || "Cashout failed" });
            }
        } catch (err) {
            setMessage({ type: 'error', text: "Network error" });
        } finally {
            setLoading(false);
        }
    };

    if (!address) return null;

    return (
        <div className={`bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 ${className}`}>
            <h3 className="text-xl font-bold text-white mb-4">Account Balance</h3>

            <div className="flex justify-between items-center mb-6 bg-gray-900 p-3 rounded">
                <span className="text-gray-400">Available Chips</span>
                <span className="text-2xl font-mono text-green-400">{balance.toFixed(3)}</span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Cashout Amount</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Amount"
                            min="0"
                            max={balance}
                        />
                        <button
                            onClick={() => setAmount(balance.toString())}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm"
                        >
                            Max
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleCashout}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-2 rounded font-bold transition-colors ${loading || !amount || parseFloat(amount) <= 0
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                >
                    {loading ? 'Processing...' : 'Cashout to Wallet'}
                </button>

                {message && (
                    <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
};
