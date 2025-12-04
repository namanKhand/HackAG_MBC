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

    // Check allowance with polling
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress || '0x0', MIDDLEMAN_VAULT_ADDRESS as `0x${string}`],
        query: {
            enabled: !!userAddress,
            refetchInterval: 1000 // Poll every second
        }
    });

    // Fetch USDC Balance
    const { data: balance } = useBalance({
        address: userAddress,
        token: USDC_ADDRESS as `0x${string}`,
        query: { enabled: !!userAddress }
    });

    // Fetch Account Balance (Chips)
    const [accountBalance, setAccountBalance] = useState<number>(0);
    useEffect(() => {
        if (userAddress) {
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${userAddress}`)
                .then(res => res.json())
                .then(data => setAccountBalance(data.balance || 0))
                .catch(err => console.error("Failed to fetch account balance", err));
        }
    }, [userAddress, isOpen]);

    useEffect(() => {
        console.log('BuyInModal Debug:', {
            userAddress,
            USDC_ADDRESS,
            balance: balance?.formatted,
            accountBalance,
            allowance: allowance?.toString(),
            step,
            isApproveSuccess
        });
    }, [userAddress, balance, accountBalance, allowance, step, isApproveSuccess]);

    useEffect(() => {
        if (isApproveSuccess && step !== 'depositing') {
            console.log("Approve success, refetching allowance...");
            refetchAllowance();
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setStep('depositing');
        }
    }, [isApproveSuccess, refetchAllowance, step]);

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

    const handleJoinWithBalance = () => {
        // Join without txHash (uses account balance)
        onSuccess(parseFloat(amount), "");
    };

    const handleAction = () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < minBuyIn || val > maxBuyIn) {
            alert(`Please enter an amount between ${minBuyIn} and ${maxBuyIn}`);
            return;
        }

        // Check if account balance is sufficient
        if (accountBalance >= val) {
            handleJoinWithBalance();
            return;
        }

        const needed = parseUnits(amount, 6);
        // If we are in 'depositing' step OR allowance is sufficient, try to deposit
        if (step === 'depositing' || (allowance && allowance >= needed)) {
            handleDeposit();
        } else {
            handleApprove();
        }
    };

    const isPending = isApprovePending || isDepositPending || isApproveConfirming || isDepositConfirming;

    // Determine button text
    let buttonText = 'Approve & Deposit';
    const needed = parseUnits(amount, 6);
    const val = parseFloat(amount);
    const canUseBalance = !isNaN(val) && accountBalance >= val;

    if (canUseBalance) {
        buttonText = 'Join with Account Balance';
    } else if (isApprovePending || isApproveConfirming) {
        buttonText = 'Approving...';
    } else if (isDepositPending || isDepositConfirming) {
        buttonText = 'Depositing...';
    } else if (step === 'depositing' || (allowance && allowance >= needed)) {
        buttonText = 'Deposit & Join';
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
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-gray-400">Amount (USDC)</label>
                        <div className="text-right">
                            <span className="block text-xs text-green-400 font-mono">
                                Account Chips: {accountBalance.toFixed(2)}
                            </span>
                            <span className="block text-xs text-blue-400 font-mono">
                                Wallet: {balance?.formatted ? Number(balance.formatted).toFixed(2) : '0.00'} USDC
                            </span>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 pr-24"
                            min={minBuyIn}
                            max={maxBuyIn}
                            disabled={isPending}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button
                                onClick={() => setAmount(minBuyIn.toString())}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                            >
                                MIN
                            </button>
                            <button
                                onClick={() => setAmount(maxBuyIn.toString())}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                            >
                                MAX
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Min: ${minBuyIn}</span>
                        <span>Max: ${maxBuyIn}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleAction}
                        disabled={isPending}
                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${canUseBalance
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white'
                            }`}
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
