import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseUnits } from 'viem';

import { USDC_ADDRESS, MIDDLEMAN_VAULT_ADDRESS } from '../constants';

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
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }]
    }
] as const;

const VAULT_ABI = [
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: []
    }
] as const;

interface BuyInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number, txHash: string) => void;
    minBuyIn: number;
    maxBuyIn: number;
    userAddress?: `0x${string}`;
}

export default function BuyInModal({ isOpen, onClose, onSuccess, minBuyIn, maxBuyIn, userAddress }: BuyInModalProps) {
    const [amount, setAmount] = useState<string>(minBuyIn.toString());
    const [step, setStep] = useState<'input' | 'approving' | 'depositing'>('input');

    const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

    // Check allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress || '0x0', MIDDLEMAN_VAULT_ADDRESS as `0x${string}`],
        query: { enabled: !!userAddress }
    });

    // Fetch USDC Balance
    const { data: balance } = useBalance({
        address: userAddress,
        token: USDC_ADDRESS as `0x${string}`,
        query: { enabled: !!userAddress }
    });

    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance();
            setStep('depositing');
            // Auto-trigger deposit after approve? Or let user click. Let's let user click for safety/clarity or auto if UX is key.
            // For now, let's just move to 'depositing' state and user clicks "Deposit"
        }
    }, [isApproveSuccess, refetchAllowance]);

    useEffect(() => {
        if (isDepositSuccess && depositHash) {
            onSuccess(parseFloat(amount), depositHash);
        }
    }, [isDepositSuccess, depositHash, amount, onSuccess]);

    if (!isOpen) return null;

    const handleApprove = () => {
        writeApprove({
            address: USDC_ADDRESS as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [MIDDLEMAN_VAULT_ADDRESS as `0x${string}`, parseUnits(amount, 6)]
        });
        setStep('approving');
    };

    const handleDeposit = () => {
        writeDeposit({
            address: MIDDLEMAN_VAULT_ADDRESS as `0x${string}`,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [parseUnits(amount, 6)]
        });
        setStep('depositing');
    };

    const handleAction = () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < minBuyIn || val > maxBuyIn) {
            alert(`Please enter an amount between ${minBuyIn} and ${maxBuyIn}`);
            return;
        }

        const needed = parseUnits(amount, 6);
        if (allowance && allowance >= needed) {
            handleDeposit();
        } else {
            handleApprove();
        }
    };

    const isPending = isApprovePending || isDepositPending || isApproveConfirming || isDepositConfirming;
    const buttonText = isApprovePending || isApproveConfirming ? 'Approving...' :
        isDepositPending || isDepositConfirming ? 'Depositing...' :
            (allowance && allowance >= parseUnits(amount, 6)) ? 'Deposit & Join' : 'Approve & Deposit';

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
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-gray-400">Amount (USDC)</label>
                        <span className="text-xs text-blue-400 font-mono">
                            Balance: {balance?.formatted ? Number(balance.formatted).toFixed(2) : '0.00'} USDC
                        </span>
                    </div>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        min={minBuyIn}
                        max={maxBuyIn}
                        disabled={isPending}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Min: ${minBuyIn}</span>
                        <span>Max: ${maxBuyIn}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleAction}
                        disabled={isPending}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {buttonText}
                    </button>
                </div>

                {isPending && (
                    <p className="text-center text-sm text-blue-400 mt-4 animate-pulse">
                        Please confirm in your wallet...
                    </p>
                )}
            </div>
        </div>
    );
}
