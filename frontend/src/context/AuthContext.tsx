"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface User {
    id: string; // Using address as ID
    username: string; // Using address as username
    isGuest: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null; // Keeping for compatibility but will be null or dummy
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { address, isConnected } = useAccount();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isConnected && address) {
            setUser({
                id: address,
                username: `${address.slice(0, 6)}...${address.slice(-4)}`,
                isGuest: false
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [isConnected, address]);

    return (
        <AuthContext.Provider value={{ user, token: null, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
