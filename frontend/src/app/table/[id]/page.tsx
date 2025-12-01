'use client';

import PokerTable from '@/components/PokerTable';
import { useParams, useSearchParams } from 'next/navigation';

export default function TablePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const tableId = params.id as string;
    const name = searchParams.get('name') || 'Guest';

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
            <PokerTable tableId={tableId} playerName={name} />
        </main>
    );
}
