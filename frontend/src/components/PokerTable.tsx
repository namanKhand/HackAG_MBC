'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';

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

export default function PokerTable({ tableId, playerName }: { tableId: string; playerName: string }) {
    const { address } = useAccount();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [table, setTable] = useState<TableState | null>(null);

    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to server');
            newSocket.emit('join_table', { tableId, name: playerName, address });
        });

        newSocket.on('table_state', (state: TableState) => {
            setTable(state);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [tableId, playerName, address]);

    const handleAction = (action: string, amount?: number) => {
        if (socket) {
            socket.emit('player_action', { tableId, action, amount });
        }
    };

    const startGame = () => {
        if (socket) {
            socket.emit('start_game', { tableId });
        }
    };

    if (!table) return <div className="flex items-center justify-center h-screen text-white font-mono animate-pulse">Loading table...</div>;

    const me = table.players.find(p => p?.id === socket?.id);
    const mySeat = me ? me.seat : 0;
    const myTurn = me?.isTurn;
    const canCheck = me && me.bet === table.currentBet;
    const callAmount = me ? table.currentBet - me.bet : 0;

    // Seat Rotation Logic
    const getRotatedPosition = (seatIndex: number) => {
        // We want 'mySeat' to be at index 0 (Bottom)
        // Relative index = (seatIndex - mySeat + 6) % 6
        const relativeIndex = (seatIndex - mySeat + 6) % 6;

        const positions = [
            'bottom-8 left-1/2 -translate-x-1/2', // Position 0 (Bottom - Me)
            'bottom-32 left-12', // Position 1 (Bottom Left)
            'top-32 left-12', // Position 2 (Top Left)
            'top-8 left-1/2 -translate-x-1/2', // Position 3 (Top)
            'top-32 right-12', // Position 4 (Top Right)
            'bottom-32 right-12', // Position 5 (Bottom Right)
        ];
        return positions[relativeIndex];
    };

    return (
        <div className="w-full max-w-7xl p-4 mx-auto font-sans">
            {/* Header */}
            <div className="flex justify-between mb-6 text-white items-center bg-black/40 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent">Table: {tableId}</h1>
                    <div className="flex gap-4 mt-1">
                        <p className="text-yellow-400 font-mono font-bold">Pot: ${table.pot}</p>
                        <p className="text-gray-400 text-sm border-l border-gray-600 pl-4">Stage: <span className="uppercase tracking-wider text-white">{table.stage}</span></p>
                    </div>
                </div>
                {!table.gameActive && (
                    <button onClick={startGame} className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all transform hover:scale-105">
                        Start Game
                    </button>
                )}
            </div>

            {/* Table Area */}
            <div className="relative h-[700px] bg-gradient-to-b from-gray-900 to-black rounded-[100px] border-[20px] border-[#1a1a1a] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center mx-auto overflow-hidden">

                {/* Red Felt Gradient */}
                <div className="absolute inset-4 rounded-[80px] bg-gradient-to-br from-red-900/40 to-black border border-red-900/20 shadow-inner"></div>

                {/* Center Logo (Base) */}
                <div className="absolute opacity-20 pointer-events-none">
                    <div className="w-64 h-64 rounded-full border-8 border-blue-500 flex items-center justify-center">
                        <div className="w-40 h-40 bg-blue-500 rounded-full"></div>
                    </div>
                </div>

                {/* Corner Logos */}
                <div className="absolute top-8 left-8 opacity-30">
                    <div className="w-12 h-12 rounded-full border-4 border-white"></div>
                </div>
                <div className="absolute top-8 right-8 opacity-30">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500 bg-blue-500"></div>
                </div>

                {/* Community Cards */}
                <div className="flex gap-3 z-10 p-6 bg-black/30 rounded-2xl border border-white/5 backdrop-blur-sm shadow-2xl">
                    {table.communityCards.map((card, i) => (
                        <CardUI key={i} card={card} />
                    ))}
                    {Array(5 - table.communityCards.length).fill(null).map((_, i) => (
                        <div key={`empty-${i}`} className="w-14 h-20 border-2 border-white/5 rounded-lg bg-white/5" />
                    ))}
                </div>

                {/* Pot Display */}
                <div className="absolute top-1/2 -translate-y-24 text-white/50 font-mono text-sm bg-black/40 px-4 py-1 rounded-full border border-white/5">
                    Total Pot: ${table.pot}
                </div>

                {/* Players */}
                {table.players.map((player, i) => {
                    if (!player) return null;

                    const positionClass = getRotatedPosition(i);
                    const isDealer = i === table.dealerIndex;

                    return (
                        <div key={player.id} className={`absolute ${positionClass} flex flex-col items-center transition-all duration-500 ease-in-out`}>
                            {/* Avatar */}
                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 
                                ${player.isTurn ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-110' : 'border-gray-700 bg-gray-900'} 
                                ${player.folded ? 'opacity-40 grayscale' : ''}
                                transition-all duration-300 z-20 group`}>

                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black opacity-90"></div>
                                <span className="relative text-sm text-center text-white font-bold px-2 truncate w-full z-10">{player.name}</span>

                                {/* Dealer Button */}
                                {isDealer && (
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-gray-300 shadow-lg z-30">
                                        D
                                    </div>
                                )}
                            </div>

                            {/* Chips & Bet */}
                            <div className="bg-black/80 px-4 py-1.5 rounded-full mt-3 text-sm text-white border border-white/10 backdrop-blur-md z-20 font-mono shadow-lg">
                                ${player.chips}
                            </div>
                            {player.bet > 0 && (
                                <div className="absolute -top-10 bg-yellow-600 px-3 py-1 rounded-lg text-sm text-white font-bold shadow-lg animate-bounce border border-yellow-400/50">
                                    ${player.bet}
                                </div>
                            )}

                            {/* Cards */}
                            <div className="flex gap-1 mt-3 -space-x-6 hover:space-x-1 transition-all duration-300">
                                {player.cards ? (
                                    player.cards.map((card, ci) => (
                                        <div key={ci} className="transform hover:-translate-y-3 transition-transform duration-300 shadow-xl">
                                            <CardUI card={card} />
                                        </div>
                                    ))
                                ) : (
                                    // Masked Cards (Backs)
                                    <>
                                        <CardUI card={null} />
                                        <CardUI card={null} />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Controls */}
            {myTurn && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 bg-black/90 p-6 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 animate-slide-up">
                    <button
                        onClick={() => handleAction('fold')}
                        className="bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 border-t border-white/20"
                    >
                        FOLD
                    </button>

                    {canCheck ? (
                        <button
                            onClick={() => handleAction('check')}
                            className="bg-gradient-to-b from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 border-t border-white/20"
                        >
                            CHECK
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction('call')}
                            className="bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 border-t border-white/20"
                        >
                            CALL ${callAmount}
                        </button>
                    )}

                    <button
                        onClick={() => handleAction('raise', table.currentBet + 20)} // Min raise logic simplified
                        className="bg-gradient-to-b from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 border-t border-white/20"
                    >
                        RAISE TO ${table.currentBet + 20}
                    </button>
                </div>
            )}
        </div>
    );
}
