import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
const MIDDLEMAN_ADDRESS = '0x53949F6E653D9934A38a76D53aA3002ebF784213';

const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
] as const;

interface BuyInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number, txHash: string) => void;
    minBuyIn: number;
    maxBuyIn: number;
}

export default function BuyInModal({ isOpen, onClose, onSuccess, minBuyIn, maxBuyIn }: BuyInModalProps) {
    const [amount, setAmount] = useState<string>(minBuyIn.toString());
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    if (!isOpen) return null;

    const handleDeposit = () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < minBuyIn || val > maxBuyIn) {
            alert(`Please enter an amount between ${minBuyIn} and ${maxBuyIn}`);
            return;
        }

        writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [MIDDLEMAN_ADDRESS, parseUnits(amount, 6)], // USDC has 6 decimals
        });
    };

    // Effect to handle success
    if (isSuccess && hash) {
        // Small delay to ensure backend sees it? Or just proceed.
        // Ideally we wait for backend socket event, but for now let's trust the tx receipt
        // and pass it to the parent to navigate.
        onSuccess(parseFloat(amount), hash);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold mb-6 text-white">Buy In</h2>

                <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        min={minBuyIn}
                        max={maxBuyIn}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Min: ${minBuyIn}</span>
                        <span>Max: ${maxBuyIn}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleDeposit}
                        disabled={isPending || isConfirming}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isPending ? 'Check Wallet...' : isConfirming ? 'Confirming...' : 'Deposit & Join'}
                    </button>
                </div>

                {isConfirming && (
                    <p className="text-center text-sm text-blue-400 mt-4 animate-pulse">
                        Waiting for transaction confirmation...
                    </p>
                )}
            </div>
        </div>
    );
}
