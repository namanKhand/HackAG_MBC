export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
export const MIDDLEMAN_VAULT_ADDRESS = process.env.NEXT_PUBLIC_MIDDLEMAN_VAULT_ADDRESS || '0xe76891e4be5dB3AAD26a66211e150A392c488eF4'; // Base Mainnet Vault

export const TABLES = [
    { id: 'micro', name: 'Micro Stakes', stakes: '0.01/0.02 USDC', minBuyIn: 0.1, maxBuyIn: 10 },
    { id: 'low', name: 'Low Stakes', stakes: '1/2 USDC', minBuyIn: 100, maxBuyIn: 200 },
    { id: 'mid', name: 'Mid Stakes', stakes: '5/10 USDC', minBuyIn: 500, maxBuyIn: 1000 },
    { id: 'high', name: 'High Stakes', stakes: '50/100 USDC', minBuyIn: 5000, maxBuyIn: 10000 },
];
