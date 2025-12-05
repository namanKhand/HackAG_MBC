'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsState {
    // Table Appearance
    fourColorDeck: boolean;
    showAvatars: boolean;
    tableColor: 'green' | 'blue' | 'red' | 'black';
    cardBack: 'classic' | 'modern';

    // Sound
    masterVolume: number;
    soundEffects: boolean;
    turnAlert: boolean;

    // Bet Slider
    showPotPercentage: boolean;
    customBetButtons: number[];
}

interface SettingsContextType {
    settings: SettingsState;
    updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
    toggleSetting: (key: keyof SettingsState) => void;
}

const defaultSettings: SettingsState = {
    fourColorDeck: true,
    showAvatars: true,
    tableColor: 'green',
    cardBack: 'classic',
    masterVolume: 80,
    soundEffects: true,
    turnAlert: true,
    showPotPercentage: true,
    customBetButtons: [2.5, 3, 4],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SettingsState>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('poker-settings');
        if (saved) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('poker-settings', JSON.stringify(settings));
        }
    }, [settings, isLoaded]);

    const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const toggleSetting = (key: keyof SettingsState) => {
        setSettings(prev => {
            const value = prev[key];
            if (typeof value === 'boolean') {
                return { ...prev, [key]: !value };
            }
            return prev;
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, toggleSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
