import { Users, ChevronRight } from 'lucide-react';

interface TableListItemProps {
    table: {
        id: string;
        name: string;
        stakes: string;
        minBuyIn: number;
        maxBuyIn: number;
    };
    onJoin: () => void;
}

export function TableListItem({ table, onJoin }: TableListItemProps) {
    return (
        <div
            onClick={onJoin}
            className="group flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer mb-2"
        >
            <div className="flex items-center gap-6">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <span className="text-lg">♠️</span>
                </div>

                {/* Info */}
                <div>
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {table.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="font-mono text-gray-400">{table.stakes}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            0/6
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats & Action */}
            <div className="flex items-center gap-8">
                <div className="hidden md:block text-right">
                    <p className="text-xs text-gray-500 mb-1">Buy-in Range</p>
                    <p className="font-mono text-sm text-gray-300">
                        ${table.minBuyIn} - ${table.maxBuyIn}
                    </p>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                </div>
            </div>
        </div>
    );
}
