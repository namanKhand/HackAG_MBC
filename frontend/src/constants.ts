export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
export const MIDDLEMAN_VAULT_ADDRESS = process.env.NEXT_PUBLIC_MIDDLEMAN_VAULT_ADDRESS || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';

export const TABLES = [
    { id: 'micro', name: 'Micro Stakes', stakes: '0.01/0.02 USDC', minBuyIn: 0.1, maxBuyIn: 10 },
    { id: 'low', name: 'Low Stakes', stakes: '1/2 USDC', minBuyIn: 100, maxBuyIn: 200 },
    { id: 'mid', name: 'Mid Stakes', stakes: '5/10 USDC', minBuyIn: 500, maxBuyIn: 1000 },
    { id: 'high', name: 'High Stakes', stakes: '50/100 USDC', minBuyIn: 5000, maxBuyIn: 10000 },
];
