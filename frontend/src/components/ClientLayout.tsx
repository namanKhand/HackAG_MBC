import React from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[url('/cyberpunk-city-bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white relative">
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
            <main className="flex-1 w-full h-full">
                {children}
            </main>
        </div>
    );
}
