'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

import { useBalance } from 'wagmi';
import { USDC_ADDRESS } from '../constants';

interface Card {
    rank: string;
    suit: string;
}

interface Player {
    id: string;
    name: string;
    chips: number;
    bet: number;
    folded: boolean;
    cards: Card[] | null; // Null if masked
    seat: number;
    isTurn: boolean;
    status: 'active' | 'sitting_out';
    totalBuyIn?: number;
    startHandChips?: number;
}

interface TableState {
    id: string;
    players: (Player | null)[];
    communityCards: Card[];
    pot: number;
    currentBet: number;
    dealerIndex: number;
    gameActive: boolean;
    stage: string;
    winners?: string[];
    handDescription?: string;
}

const CardUI = ({ card }: { card: Card | null }) => {
    if (!card) {
        return (
            <div className="w-14 h-20 bg-blue-900 rounded-lg border-2 border-white/50 flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
                <div className="w-12 h-18 border border-white/20 rounded bg-blue-800 pattern-grid-lg" />
            </div>
        );
    }

    const isRed = card.suit === 'h' || card.suit === 'd';
    const suitSymbol = { h: '♥', d: '♦', c: '♣', s: '♠' }[card.suit];

    return (
        <div className="w-14 h-20 bg-white rounded-lg text-black flex flex-col items-center justify-center border border-gray-300 shadow-md relative transform hover:scale-105 transition-transform">
            <span className={`text-sm font-bold absolute top-1 left-1 ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</span>
            <span className={`text-2xl leading-none ${isRed ? 'text-red-600' : 'text-black'}`}>{suitSymbol}</span>
            <span className={`text-sm font-bold absolute bottom-1 right-1 rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</span>
        </div>
    );
};

export default function PokerTable({
    tableId,
    playerName,
    mode,
    minBuyIn = 100,
    maxBuyIn = 1000,
    initialBuyIn,
    initialTxHash
}: {
    tableId: string;
    playerName: string;
    mode: string;
    minBuyIn?: number;
    maxBuyIn?: number;
    initialBuyIn?: number;
    initialTxHash?: string;
}) {
    const { address } = useAccount();
    const { token } = useAuth();
    const router = useRouter();
    const { data: balanceData } = useBalance({
        address: address,
        token: USDC_ADDRESS as `0x${string}`,
    });
    const walletBalance = balanceData ? Number(balanceData.formatted) : 0;

    const [socket, setSocket] = useState<Socket | null>(null);
    const [table, setTable] = useState<TableState | null>(null);
    const [raiseAmount, setRaiseAmount] = useState<number>(0);
    const [showBuyInModal, setShowBuyInModal] = useState(!initialBuyIn);
    const [buyInAmount, setBuyInAmount] = useState(initialBuyIn || maxBuyIn);
    const [showRankings, setShowRankings] = useState(false);
    const [showLedger, setShowLedger] = useState(false);

    const [preAction, setPreAction] = useState<'none' | 'checkFold' | 'callAny'>('none');
    const preActionRef = useRef<'none' | 'checkFold' | 'callAny'>('none');

    // Sync ref with state
    useEffect(() => {
        preActionRef.current = preAction;
    }, [preAction]);

    const [chipsBalance, setChipsBalance] = useState<number>(0);

    // Fetch Chips Balance
    // Fetch Chips Balance
    const fetchBalance = () => {
        if (address) {
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/balance/${address}`)
                .then(res => res.json())
                .then(data => setChipsBalance(data.balance || 0))
                .catch(err => console.error("Failed to fetch account balance", err));
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [address, showBuyInModal]); // Refetch when modal opens

    // Refetch balance when I join the table
    useEffect(() => {
        if (me) {
            fetchBalance();
        }
    }, [me?.id]);

    // Derive effective buy-in to avoid useEffect state updates
    // Allow slider to go up to maxBuyIn regardless of wallet balance
    const effectiveBuyIn = Math.min(Math.max(minBuyIn, buyInAmount), maxBuyIn);

    // Check against CHIPS balance for Real Money mode
    const canBuyIn = mode === 'paper' || (chipsBalance >= effectiveBuyIn);

    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');

        newSocket.on('connect', () => {
            console.log('Connected to server');
            setSocket(newSocket);

            const params = new URLSearchParams(window.location.search);
            const action = params.get('action');

            if (action === 'create') {
                newSocket.emit('create_table', { tableId });
            }

            if (initialBuyIn) {
                setTimeout(() => {
                    newSocket.emit('join_table', {
                        tableId,
                        name: playerName,
                        address,
                        buyInAmount: initialBuyIn,
                        txHash: initialTxHash,
                        token
                    });
                }, 100);
            }
        });

        newSocket.on('table_state', (state: TableState) => {
            setTable(state);
            // Update raise amount default when turn starts
            const me = state.players.find(p => p?.id === newSocket.id);
            if (me?.isTurn) {
                const minRaise = state.currentBet + 20; // Simplified min raise
                setRaiseAmount(Math.min(minRaise, me.chips + me.bet));

                // Handle Pre-Actions using REF to avoid stale closure
                const currentPreAction = preActionRef.current;

                if (currentPreAction === 'checkFold') {
                    if (state.currentBet > me.bet) {
                        newSocket.emit('player_action', { tableId, action: 'fold' });
                    } else {
                        newSocket.emit('player_action', { tableId, action: 'check' });
                    }
                    setPreAction('none');
                } else if (currentPreAction === 'callAny') {
                    newSocket.emit('player_action', { tableId, action: 'call' });
                    setPreAction('none');
                }
            }
        });

        newSocket.on('error', (msg: string) => {
            if (msg === 'Table not found') {
                alert('Table not found. Redirecting to Lobby...');
                router.push('/lobby');
            } else {
                alert(msg);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [tableId, playerName, address, initialBuyIn, initialTxHash, token, router]);

    const handleAction = (action: string, amount?: number) => {
        if (socket) {
            socket.emit('player_action', { tableId, action, amount });
        }
    };

    const handleJoinTable = () => {
        if (socket) {
            // For now, manual join assumes Paper mode or future integration.
            socket.emit('join_table', {
                tableId,
                name: playerName,
                address,
                buyInAmount: effectiveBuyIn,
                token
            });
            setShowBuyInModal(false);
        }
    };

    const handleLeaveTable = () => {
        if (socket) {
            socket.emit('leave_table', { tableId });
            router.push(`/lobby?mode=${mode}`);
        }
    };

    const startGame = () => {
        console.log('Start Game button clicked');
        if (socket) {
            console.log('Emitting start_game event for table:', tableId);
            socket.emit('start_game', { tableId });
        } else {
            console.error('Socket not connected');
        }
    };

    const me = table?.players.find(p => p?.id === socket?.id);

    // DEBUG LOGGING
    useEffect(() => {
        if (table) {
            console.log('Table State:', table);
            console.log('My Socket ID:', socket?.id);
            console.log('Me Object:', me);
            if (me) {
                console.log('Total BuyIn:', me.totalBuyIn);
                console.log('Start Hand Chips:', me.startHandChips);
            }
        }
    }, [table, me, socket?.id]);

    if (!table && !showBuyInModal) return <div className="flex items-center justify-center h-screen text-white font-mono animate-pulse">Loading table...</div>;

    const mySeat = me ? me.seat : 0;
    const myTurn = me?.isTurn;
    const canCheck = me && table && me.bet === table.currentBet;
    const callAmount = me && table ? table.currentBet - me.bet : 0;

    // Seat Rotation Logic
    const getRotatedPosition = (seatIndex: number) => {
        // We want 'mySeat' to be at index 0 (Bottom)
        // Relative index = (seatIndex - mySeat + 6) % 6
        const relativeIndex = (seatIndex - mySeat + 6) % 6;

        const positions = [
            'bottom-[-40px] left-1/2 -translate-x-1/2', // Position 0 (Me - Bottom Center - Restored)
            'bottom-24 left-8', // Position 1 (Bottom Left)
            'top-24 left-8', // Position 2 (Top Left)
            'top-[-40px] left-1/2 -translate-x-1/2', // Position 3 (Top Center)
            'top-24 right-8', // Position 4 (Top Right)
            'bottom-64 right-8', // Position 5 (Bottom Right - Moved up to avoid HUD)
        ];
        return positions[relativeIndex];
    };

    return (
        <div className="w-full max-w-7xl p-4 mx-auto font-sans">
            {table && (
                <>
                    {/* Header */}
                    <div className="flex justify-between mb-6 text-white items-center bg-black/40 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent">Table: {tableId}</h1>
                            <div className="flex gap-4 mt-1">
                                <p className="text-yellow-400 font-mono font-bold">Pot: ${table.pot}</p>
                                <p className="text-gray-400 text-sm border-l border-gray-600 pl-4">Stage: <span className="uppercase tracking-wider text-white">{table.stage}</span></p>
                            </div>
                        </div>
                        {(() => {
                            console.log('Rendering Header. Game Active:', table.gameActive);
                            return !table.gameActive && (
                                <button onClick={startGame} className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all transform hover:scale-105">
                                    Start Game
                                </button>
                            );
                        })()}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowRankings(!showRankings)}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                            >
                                Rankings ?
                            </button>
                            {!me && (
                                <button
                                    onClick={() => setShowBuyInModal(true)}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg animate-pulse"
                                >
                                    Join Table
                                </button>
                            )}
                            {me && (
                                <>
                                    <button
                                        onClick={() => {
                                            if (me.status === 'active') socket?.emit('sit_out', { tableId });
                                            else socket?.emit('back_in', { tableId });
                                        }}
                                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${me.status === 'active' ? 'bg-yellow-900/50 hover:bg-yellow-900 text-yellow-200' : 'bg-green-900/50 hover:bg-green-900 text-green-200'}`}
                                    >
                                        {me.status === 'active' ? 'Sit Out' : 'I\'m Back'}
                                    </button>
                                    <button
                                        onClick={() => setShowLedger(!showLedger)}
                                        className="bg-blue-900/50 hover:bg-blue-900 text-blue-200 px-4 py-2 rounded-lg font-bold transition-colors"
                                    >
                                        Ledger
                                    </button>
                                    <button
                                        onClick={handleLeaveTable}
                                        className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded-lg font-bold transition-colors"
                                    >
                                        Leave Table
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Session Ledger Popup */}
                    {showLedger && me && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowLedger(false)}>
                            <div className="bg-gray-900 p-6 rounded-2xl border border-white/10 shadow-2xl w-80 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-yellow-400">Session Ledger</h3>
                                    <button onClick={() => setShowLedger(false)} className="text-gray-400 hover:text-white transition-colors">
                                        ✕
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-black/40 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-gray-400">Total Buy-In</span>
                                        <span className="font-mono text-lg text-white">${me.totalBuyIn ?? me.startHandChips ?? 0}</span>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-gray-400">Current Chips</span>
                                        <span className="font-mono text-lg text-blue-400">${me.chips}</span>
                                    </div>
                                    <div className="border-t border-white/10 my-2"></div>
                                    <div className="bg-black/40 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-gray-400">Net Profit</span>
                                        <span className={`font-mono text-xl font-bold ${(me.chips - (me.totalBuyIn ?? me.startHandChips ?? 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {(me.chips - (me.totalBuyIn ?? me.startHandChips ?? 0)) >= 0 ? '+' : ''}
                                            ${me.chips - (me.totalBuyIn ?? me.startHandChips ?? 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table Area */}
                    <div className="relative h-[600px] bg-gradient-to-b from-gray-900 to-black rounded-[200px] border-[20px] border-[#1a1a1a] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center mx-auto mb-32 mt-12 w-[90%]">

                        {/* Red Felt Gradient */}
                        <div className="absolute inset-4 rounded-[180px] bg-gradient-to-br from-red-900/40 to-black border border-red-900/20 shadow-inner"></div>

                        {/* Center Logo (Base) */}
                        <div className="absolute opacity-20 pointer-events-none">
                            <div className="w-64 h-64 rounded-full border-8 border-blue-500 flex items-center justify-center">
                                <div className="w-40 h-40 bg-blue-500 rounded-full"></div>
                            </div>
                        </div>

                        {/* Community Cards */}
                        <div className="flex gap-3 z-10 p-6 bg-black/30 rounded-2xl border border-white/5 backdrop-blur-sm shadow-2xl transform -translate-y-8">
                            {table.communityCards.map((card, i) => (
                                <CardUI key={i} card={card} />
                            ))}
                            {Array(5 - table.communityCards.length).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} className="w-14 h-20 border-2 border-white/5 rounded-lg bg-white/5" />
                            ))}
                        </div>

                        {/* Pot Display */}
                        <div className="absolute top-1/2 translate-y-12 text-white/90 font-mono text-lg bg-black/60 px-6 py-2 rounded-full border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                            Pot: <span className="text-yellow-400 font-bold">${table.pot}</span>
                        </div>

                        {/* Players */}
                        {table.players.map((player, i) => {
                            if (!player) return null;

                            const positionClass = getRotatedPosition(i);
                            const isDealer = i === table.dealerIndex;
                            const isMe = player.id === socket?.id;

                            return (
                                <div key={player.id} className={`absolute ${positionClass} flex flex-col items-center transition-all duration-500 ease-in-out z-30`}>
                                    {/* Avatar */}
                                    <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border-4 
                                        ${player.isTurn ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-110' :
                                            table.winners?.includes(player.id) ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.8)] scale-110 ring-4 ring-yellow-200 animate-pulse' :
                                                'border-gray-700 bg-gray-900'} 
                                        ${player.folded || player.status === 'sitting_out' ? 'opacity-40 grayscale' : ''}
                                        transition-all duration-300 z-20 group`}>

                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black opacity-90"></div>
                                        <span className="relative text-xs text-center text-white font-bold px-2 truncate w-full z-10">{player.name}</span>

                                        {/* Dealer Button */}
                                        {isDealer && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs border-2 border-gray-300 shadow-lg z-30">
                                                D
                                            </div>
                                        )}
                                    </div>

                                    {/* Chips & Bet */}
                                    <div className="bg-black/80 px-3 py-1 rounded-full -mt-2 text-xs text-white border border-white/10 backdrop-blur-md z-30 font-mono shadow-lg relative">
                                        ${player.chips}
                                    </div>

                                    {player.bet > 0 && (
                                        <div className="absolute top-24 bg-yellow-600 px-3 py-1 rounded-lg text-xs text-white font-bold shadow-lg border border-yellow-400/50 z-20 whitespace-nowrap">
                                            Bet: ${player.bet}
                                        </div>
                                    )}

                                    {/* Cards - Only show for others or if not me (my cards are shown separately at bottom) */}
                                    {!isMe && (
                                        <div className="flex gap-1 mt-2 -space-x-4 hover:space-x-1 transition-all duration-300 scale-75 origin-top">
                                            {player.cards ? (
                                                player.cards.map((card, ci) => (
                                                    <div key={ci} className="shadow-xl">
                                                        <CardUI card={card} />
                                                    </div>
                                                ))
                                            ) : (
                                                <>
                                                    <CardUI card={null} />
                                                    <CardUI card={null} />
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Hand Description Bubble */}
                                    {isMe && table.handDescription && (
                                        <div className="absolute -top-12 bg-black/80 text-yellow-400 text-xs px-3 py-1 rounded-full border border-yellow-400/30 whitespace-nowrap">
                                            {table.handDescription}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* My Cards & Controls Area - Fixed at Bottom Right */}
                    {me && (
                        <div className="fixed bottom-4 right-4 p-4 bg-black/80 rounded-2xl border border-white/10 backdrop-blur-xl z-50 flex items-end gap-6 shadow-2xl">

                            {/* My Cards */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-gray-400 text-xs font-bold tracking-wider uppercase">Your Hand</div>
                                <div className="flex gap-2">
                                    {me.cards ? (
                                        me.cards.map((card, ci) => (
                                            <div key={ci} className="shadow-lg transform hover:-translate-y-1 transition-transform">
                                                <CardUI card={card} />
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <div className="opacity-50"><CardUI card={null} /></div>
                                            <div className="opacity-50"><CardUI card={null} /></div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Controls */}
                            {!me.folded && (
                                <div className="flex gap-2 items-end">
                                    {myTurn ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction('fold')}
                                                className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
                                            >
                                                FOLD
                                            </button>

                                            {canCheck ? (
                                                <button
                                                    onClick={() => handleAction('check')}
                                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
                                                >
                                                    CHECK
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction('call')}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
                                                >
                                                    CALL ${callAmount}
                                                </button>
                                            )}

                                            {me.chips + me.bet > table.currentBet && (
                                                <div className="flex flex-col gap-1 items-center bg-black/40 p-1 rounded-xl border border-white/5">
                                                    <input
                                                        type="range"
                                                        min={Math.min(table.currentBet + 20, me.chips + me.bet)}
                                                        max={me.chips + me.bet}
                                                        value={raiseAmount}
                                                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                                                        className="w-24 accent-green-500 h-1"
                                                    />
                                                    <button
                                                        onClick={() => handleAction('raise', raiseAmount)}
                                                        className="bg-green-600 hover:bg-green-500 text-white px-2 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95 text-xs w-full whitespace-nowrap"
                                                    >
                                                        {raiseAmount === me.chips + me.bet ? 'ALL IN' : `RAISE $${raiseAmount}`}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Pre-Action Buttons */
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPreAction(preAction === 'checkFold' ? 'none' : 'checkFold')}
                                                className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${preAction === 'checkFold' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                            >
                                                Check/Fold
                                            </button>
                                            <button
                                                onClick={() => setPreAction(preAction === 'callAny' ? 'none' : 'callAny')}
                                                className={`px-4 py-3 rounded-lg font-bold transition-all text-sm ${preAction === 'callAny' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                            >
                                                Call Any
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Hand Rankings Modal */}
            {showRankings && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowRankings(false)}>
                    <div className="bg-slate-900 p-6 rounded-2xl max-w-4xl w-full border border-white/10 overflow-y-auto max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-white">Hand Rankings</h2>
                            <button onClick={() => setShowRankings(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { name: 'Royal Flush', desc: 'A-K-Q-J-10 (Same Suit)', cards: [{ rank: 'A', suit: 'h' }, { rank: 'K', suit: 'h' }, { rank: 'Q', suit: 'h' }, { rank: 'J', suit: 'h' }, { rank: '10', suit: 'h' }] },
                                { name: 'Straight Flush', desc: 'Five Sequential (Same Suit)', cards: [{ rank: '9', suit: 's' }, { rank: '8', suit: 's' }, { rank: '7', suit: 's' }, { rank: '6', suit: 's' }, { rank: '5', suit: 's' }] },
                                { name: 'Four of a Kind', desc: 'Four Same Rank', cards: [{ rank: '8', suit: 'h' }, { rank: '8', suit: 'd' }, { rank: '8', suit: 'c' }, { rank: '8', suit: 's' }, { rank: 'K', suit: 'd' }] },
                                { name: 'Full House', desc: 'Three of a Kind + Pair', cards: [{ rank: '10', suit: 'h' }, { rank: '10', suit: 'd' }, { rank: '10', suit: 'c' }, { rank: '4', suit: 's' }, { rank: '4', suit: 'd' }] },
                                { name: 'Flush', desc: 'Five Same Suit', cards: [{ rank: 'A', suit: 'c' }, { rank: 'J', suit: 'c' }, { rank: '8', suit: 'c' }, { rank: '4', suit: 'c' }, { rank: '2', suit: 'c' }] },
                                { name: 'Straight', desc: 'Five Sequential', cards: [{ rank: '9', suit: 'c' }, { rank: '8', suit: 'd' }, { rank: '7', suit: 's' }, { rank: '6', suit: 'h' }, { rank: '5', suit: 'd' }] },
                                { name: 'Three of a Kind', desc: 'Three Same Rank', cards: [{ rank: '7', suit: 'c' }, { rank: '7', suit: 's' }, { rank: '7', suit: 'd' }, { rank: 'K', suit: 'h' }, { rank: '2', suit: 's' }] },
                                { name: 'Two Pair', desc: 'Two Different Pairs', cards: [{ rank: 'J', suit: 'h' }, { rank: 'J', suit: 'd' }, { rank: '4', suit: 'c' }, { rank: '4', suit: 's' }, { rank: 'A', suit: 'h' }] },
                                { name: 'Pair', desc: 'Two Same Rank', cards: [{ rank: 'A', suit: 'h' }, { rank: 'A', suit: 'd' }, { rank: 'K', suit: 'c' }, { rank: 'J', suit: 's' }, { rank: '8', suit: 'h' }] },
                                { name: 'High Card', desc: 'Highest Rank Card', cards: [{ rank: 'A', suit: 'h' }, { rank: 'J', suit: 'd' }, { rank: '8', suit: 's' }, { rank: '6', suit: 'c' }, { rank: '2', suit: 'h' }] },
                            ].map((rank, i) => (
                                <div key={i} className="flex flex-col md:flex-row items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="md:w-1/3 text-center md:text-left">
                                        <h3 className="text-xl font-bold text-yellow-400">{rank.name}</h3>
                                        <p className="text-gray-400 text-sm">{rank.desc}</p>
                                    </div>
                                    <div className="flex gap-2 scale-75 md:scale-100 origin-center">
                                        {rank.cards.map((card, ci) => (
                                            <CardUI key={ci} card={card} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="mt-8 w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all" onClick={() => setShowRankings(false)}>Close Rankings</button>
                    </div>
                </div>
            )}

            {/* Buy-in Modal */}
            {showBuyInModal && (
                <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4">
                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl text-center relative">
                        <button
                            onClick={() => {
                                setShowBuyInModal(false);
                                router.push(`/lobby?mode=${mode}`);
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                        <h2 className="text-3xl font-bold text-white mb-2">Buy In</h2>
                        <p className="text-gray-400 mb-2">Select your buy-in amount to join the table.</p>
                        {mode === 'real' && (
                            <div className="mb-6 space-y-1">
                                <p className="text-green-400 font-mono text-sm">Game Chips: {chipsBalance.toFixed(2)}</p>
                                <p className="text-blue-400 font-mono text-xs">Wallet: {walletBalance.toFixed(2)} USDC</p>
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <span className="text-2xl font-bold text-green-400 font-mono">$</span>
                                <input
                                    type="number"
                                    min={minBuyIn}
                                    max={maxBuyIn}
                                    value={buyInAmount}
                                    onChange={(e) => setBuyInAmount(Number(e.target.value))}
                                    className="bg-transparent text-5xl font-bold text-green-400 font-mono w-48 text-center focus:outline-none border-b-2 border-green-500/30 focus:border-green-500 transition-colors"
                                />
                            </div>

                            <input
                                type="range"
                                min={minBuyIn}
                                max={maxBuyIn}
                                step={minBuyIn < 1 ? "0.1" : "50"}
                                value={effectiveBuyIn}
                                onChange={(e) => setBuyInAmount(Number(e.target.value))}
                                className="w-full accent-green-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-gray-500 text-sm mt-2 font-mono">
                                <span>${minBuyIn}</span>
                                <span>${maxBuyIn}</span>
                            </div>
                        </div>

                        {!canBuyIn ? (
                            <div className="text-center">
                                <div className="text-red-500 font-bold mb-4">
                                    {chipsBalance < minBuyIn ? `Insufficient chips. Minimum buy-in is $${minBuyIn}.` : "Insufficient chips for selected buy-in."}
                                </div>
                                <button
                                    onClick={() => router.push('/lobby')}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg"
                                >
                                    Go to Lobby to Deposit
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleJoinTable}
                                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white py-4 rounded-xl font-bold text-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                            >
                                JOIN TABLE
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
