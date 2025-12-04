import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseUnits } from 'viem';
import { USDC_ADDRESS, MIDDLEMAN_VAULT_ADDRESS } from '../constants';

const ERC20_ABI = [
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

interface DepositPanelProps {
    className?: string;
}

export const DepositPanel: React.FC<DepositPanelProps> = ({ className }) => {
    const { address } = useAccount();
    const [amount, setAmount] = useState<string>('');
    const [step, setStep] = useState<'input' | 'approving' | 'depositing' | 'verifying'>('input');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [accountBalance, setAccountBalance] = useState<number>(0);

    // Wallet Balance
    const { data: walletBalance } = useBalance({
        address,
        token: USDC_ADDRESS as `0x${string}`,
    });

    // Contract Writes
    const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

    // Allowance Check
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address || '0x0', MIDDLEMAN_VAULT_ADDRESS as `0x${string}`],
    });

    // Fetch Account Balance
    const fetchAccountBalance = React.useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${address}`);
            const data = await res.json();
            if (data.balance !== undefined) {
                setAccountBalance(data.balance);
            }
        } catch (err) {
            console.error("Failed to fetch balance", err);
        }
    }, [address]);

    const verifyDeposit = React.useCallback(async (txHash: string) => {
        try {
            // Call backend to verify deposit
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verify-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, txHash })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setMessage({ type: 'success', text: `Successfully deposited ${data.amount} chips!` });
                setAmount('');
                setStep('input');
                fetchAccountBalance();
            } else {
                setMessage({ type: 'error', text: "Verification failed. Please contact support." });
                setStep('input');
            }
        } catch (err) {
            console.error("Verification error", err);
            setMessage({ type: 'error', text: "Verification error. Please contact support." });
            setStep('input');
        }
    }, [address, fetchAccountBalance]);

    useEffect(() => {
        fetchAccountBalance();
        const interval = setInterval(fetchAccountBalance, 10000);
        return () => clearInterval(interval);
    }, [address, fetchAccountBalance]);

    // Handle Approve Success
    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance();
            setStep('depositing');
        }
    }, [isApproveSuccess, refetchAllowance]);

    // Handle Deposit Success
    useEffect(() => {
        if (isDepositSuccess && depositHash && step !== 'verifying') {
            setStep('verifying');
            verifyDeposit(depositHash);
        }
    }, [isDepositSuccess, depositHash, verifyDeposit, step]);



    const handleAction = () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            setMessage({ type: 'error', text: "Invalid amount" });
            return;
        }

        const needed = parseUnits(amount, 6);
        if (allowance && allowance >= needed) {
            handleDeposit();
        } else {
            handleApprove();
        }
    };

    const handleApprove = () => {
        setMessage(null);
        writeApprove({
            address: USDC_ADDRESS as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [MIDDLEMAN_VAULT_ADDRESS as `0x${string}`, parseUnits(amount, 6)]
        });
        setStep('approving');
    };

    const handleDeposit = () => {
        setMessage(null);
        writeDeposit({
            address: MIDDLEMAN_VAULT_ADDRESS as `0x${string}`,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [parseUnits(amount, 6)]
        });
        setStep('depositing');
    };

    if (!address) return null;

    const isPending = isApprovePending || isDepositPending || isApproveConfirming || isDepositConfirming || step === 'verifying';

    let buttonText = 'Approve & Deposit';
    const needed = parseUnits(amount || '0', 6);

    if (isApprovePending || isApproveConfirming) buttonText = 'Approving...';
    else if (isDepositPending || isDepositConfirming) buttonText = 'Depositing...';
    else if (step === 'verifying') buttonText = 'Verifying...';
    else if (allowance && allowance >= needed) buttonText = 'Deposit USDC';

    return (
        <div className={`bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 ${className}`}>
            <h3 className="text-xl font-bold text-white mb-4">Deposit Funds</h3>

            <div className="flex justify-between items-center mb-2 bg-gray-900 p-3 rounded">
                <span className="text-gray-400 text-sm">Account Balance</span>
                <span className="text-xl font-mono text-green-400">{accountBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-6 bg-gray-900 p-3 rounded">
                <span className="text-gray-400 text-sm">Wallet Balance</span>
                <span className="text-sm font-mono text-blue-400">
                    {walletBalance?.formatted ? Number(walletBalance.formatted).toFixed(2) : '0.00'} USDC
                </span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Deposit Amount (USDC)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Amount"
                        min="0"
                        disabled={isPending}
                    />
                </div>

                <button
                    onClick={handleAction}
                    disabled={isPending || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-2 rounded font-bold transition-colors ${isPending || !amount || parseFloat(amount) <= 0
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {buttonText}
                </button>

                {message && (
                    <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                {isPending && (
                    <p className="text-center text-xs text-blue-400 animate-pulse">
                        Please confirm transaction in your wallet...
                    </p>
                )}
            </div>
        </div>
    );
};
