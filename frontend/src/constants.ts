export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
export const MIDDLEMAN_VAULT_ADDRESS = process.env.NEXT_PUBLIC_MIDDLEMAN_VAULT_ADDRESS || '0xe76891e4be5dB3AAD26a66211e150A392c488eF4'; // Base Mainnet Vault

export const TABLES = [
    { id: 'micro-1', name: 'Micro Stakes', stakes: '0.01/0.02 USDC', minBuyIn: 1, maxBuyIn: 2, isRealMoney: true },
    { id: 'micro-2', name: 'Micro Stakes', stakes: '0.1/0.2 USDC', minBuyIn: 10, maxBuyIn: 20, isRealMoney: true },
    { id: 'low-1', name: 'Low Stakes', stakes: '0.5/1 USDC', minBuyIn: 50, maxBuyIn: 100, isRealMoney: true },
    { id: 'low-2', name: 'Low Stakes', stakes: '1/2 USDC', minBuyIn: 100, maxBuyIn: 200, isRealMoney: true },
    { id: 'mid-1', name: 'Mid Stakes', stakes: '2/5 USDC', minBuyIn: 200, maxBuyIn: 500, isRealMoney: true },
    { id: 'mid-2', name: 'Mid Stakes', stakes: '5/10 USDC', minBuyIn: 500, maxBuyIn: 1000, isRealMoney: true },
    { id: 'high-1', name: 'High Stakes', stakes: '10/20 USDC', minBuyIn: 1000, maxBuyIn: 2000, isRealMoney: true },
    { id: 'high-2', name: 'High Stakes', stakes: '50/100 USDC', minBuyIn: 5000, maxBuyIn: 10000, isRealMoney: true },
];
