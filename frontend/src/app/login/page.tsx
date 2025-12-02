"use client";

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: username, password })
            });
            const data = await res.json();
            if (res.ok) {
                login(data.token, data.user);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const guestName = prompt("Enter a display name for guest mode:");
            if (!guestName) {
                setLoading(false);
                return;
            }
            const res = await fetch('http://localhost:3001/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: guestName })
            });
            const data = await res.json();
            if (res.ok) {
                login(data.token, data.user);
            } else {
                setError(data.error || 'Guest login failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-black z-0"></div>

            {/* Animated Circles / Crypto Theme */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[120px]"></div>

            {/* Floating Elements (Abstract Crypto/Base) */}
            <div className="absolute top-20 right-20 w-24 h-24 border border-red-500/20 rounded-full flex items-center justify-center animate-spin-slow">
                <div className="w-16 h-16 border border-white/10 rounded-full"></div>
            </div>
            <div className="absolute bottom-40 left-20 w-32 h-32 border border-blue-500/10 rounded-full flex items-center justify-center animate-reverse-spin">
                <div className="w-20 h-20 border border-white/5 rounded-full"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.1)] w-full max-w-md mx-4">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-0 transition-transform">
                        <span className="text-3xl">♠️</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                    <p className="text-gray-400 text-sm mt-2">Enter your credentials to access the tables</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username or Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Authenticating...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 flex items-center justify-between text-sm">
                    <span className="text-gray-500">New here?</span>
                    <Link href="/register" className="text-red-400 hover:text-red-300 font-bold transition-colors">
                        Create Account
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <button
                        onClick={handleGuestLogin}
                        disabled={loading}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3 px-4 rounded-xl transition-all border border-white/5 hover:border-white/10 text-sm"
                    >
                        Continue as Guest (Play Money)
                    </button>
                </div>
            </div>

            {/* Footer / Branding */}
            <div className="absolute bottom-6 text-center w-full text-gray-600 text-xs font-mono">
                SECURED BY BASE • POWERED BY CRYPTO
            </div>
        </div>
    );
}
