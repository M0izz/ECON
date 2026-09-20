import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { monadTestnet } from '@reown/appkit/networks';
import { QueryClient } from '@tanstack/react-query';

// Shared TanStack Query client for blockchain read caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

const runtimeEnv = (import.meta as any).env;

// Reown / WalletConnect Project ID from Vite env or standard fallback
export const projectId =
  (runtimeEnv?.VITE_REOWN_PROJECT_ID as string | undefined) ||
  (runtimeEnv?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ||
  'b56e18d47c72ab683b10814fe9495694';

export const networks = [monadTestnet] as const;

// Wagmi Adapter with Monad Testnet as the primary EVM chain
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [monadTestnet],
  ssr: false,
});

// Initialize Reown AppKit with EIP-6963 discovery and WalletConnect network
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [monadTestnet],
  defaultNetwork: monadTestnet,
  projectId,
  metadata: {
    name: 'ECON Protocol',
    description: 'Autonomous Agent Economic Operating Layer on Monad',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://econ.network',
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00E599',
    '--w3m-color-mix': '#041B26',
    '--w3m-color-mix-strength': 35,
    '--w3m-border-radius-master': '8px',
  },
});

export { monadTestnet };
