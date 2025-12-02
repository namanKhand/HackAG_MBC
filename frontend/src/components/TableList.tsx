import { useState } from 'react';

interface TableInfo {
    id: string;
    name: string;
    smallBlind: number;
    bigBlind: number;
    players: number;
}

export default function TableList({ tables, onJoin }: { tables: TableInfo[], onJoin: (id: string) => void }) {
    if (tables.length === 0) {
        return (
            <div className="text-center text-gray-500 py-12">
                <p className="text-xl">No active tables found.</p>
                <p className="text-sm">Create a new game to get started!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {tables.map(table => (
                <div key={table.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all hover:-translate-y-1 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white truncate pr-2">{table.name}</h3>
                        <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded border border-green-500/30">
                            ${table.smallBlind}/${table.bigBlind}
                        </span>
                    </div>

                    <div className="flex justify-between text-gray-400 mb-6 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>Active</span>
                        </div>
                        <span>{table.players}/6 Players</span>
                    </div>

                    <button
                        onClick={() => onJoin(table.id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                    >
                        Join Table
                    </button>
                </div>
            ))}
        </div>
    );
}
