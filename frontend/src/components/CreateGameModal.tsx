import { useState } from 'react';

interface CreateGameModalProps {
    onClose: () => void;
    onCreate: (config: { name: string, smallBlind: number, bigBlind: number, isPublic: boolean }) => void;
}

const STAKES = [
    { sb: 0.1, bb: 0.2, label: '$0.10 / $0.20' },
    { sb: 0.5, bb: 1, label: '$0.50 / $1.00' },
    { sb: 1, bb: 2, label: '$1 / $2' },
    { sb: 2, bb: 5, label: '$2 / $5' },
    { sb: 5, bb: 10, label: '$5 / $10' },
    { sb: 10, bb: 20, label: '$10 / $20' },
];

export default function CreateGameModal({ onClose, onCreate }: CreateGameModalProps) {
    const [name, setName] = useState('');
    const [selectedStake, setSelectedStake] = useState(2); // Default 1/2
    const [isPublic, setIsPublic] = useState(true);

    const handleSubmit = () => {
        if (!name) return;
        const stake = STAKES[selectedStake];
        onCreate({
            name,
            smallBlind: stake.sb,
            bigBlind: stake.bb,
            isPublic
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent">Create New Game</h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Table Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Friday Night Poker"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 rounded-xl bg-black/50 border border-white/10 text-white focus:border-red-500 focus:outline-none transition-colors"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Stakes</label>
                        <div className="grid grid-cols-2 gap-2">
                            {STAKES.map((stake, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedStake(i)}
                                    className={`p-3 rounded-lg text-sm font-bold transition-all ${selectedStake === i
                                        ? 'bg-red-600 text-white shadow-lg scale-105'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {stake.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Visibility</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsPublic(true)}
                                className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${isPublic ? 'bg-red-600/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                                <span className="font-bold">Public</span>
                                <span className="text-xs opacity-70">Listed in Lobby</span>
                            </button>
                            <button
                                onClick={() => setIsPublic(false)}
                                className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${!isPublic ? 'bg-red-600/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                                <span className="font-bold">Private</span>
                                <span className="text-xs opacity-70">Invite Only (Code)</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!name}
                        className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Table
                    </button>
                </div>
            </div>
        </div>
    );
}
