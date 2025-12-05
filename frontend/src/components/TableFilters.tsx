import { Search, Filter, LayoutGrid, List as ListIcon } from 'lucide-react';

interface TableFiltersProps {
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedStakes: string;
    onStakesChange: (stakes: string) => void;
}

export function TableFilters({
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
    selectedStakes,
    onStakesChange
}: TableFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
            {/* Search */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="Search tables..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                {/* Stakes Filter */}
                <div className="relative">
                    <select
                        value={selectedStakes}
                        onChange={(e) => onStakesChange(e.target.value)}
                        className="appearance-none bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer min-w-[140px]"
                    >
                        <option value="all">All Stakes</option>
                        <option value="micro">Micro (0.1/0.2)</option>
                        <option value="low">Low (1/2)</option>
                        <option value="mid">Mid (5/10)</option>
                        <option value="high">High (10/20+)</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                </div>

                {/* View Toggle */}
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                ? 'bg-zinc-800 text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                ? 'bg-zinc-800 text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <ListIcon size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
