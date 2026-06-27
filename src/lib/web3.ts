import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { celo } from '@wagmi/core/chains';
import { injected } from 'wagmi/connectors';
import { http, createConfig } from 'wagmi';

export const projectId =
  (import.meta.env.VITE_REOWN_PROJECT_ID as string) ||
  '8e438479e3e7f9175d713a010477e3fb';

// Celo-only config — injected connector first so MiniPay auto-connects
export const config = createConfig({
  chains: [celo],
  connectors: [injected()],
  transports: { [celo.id]: http() },
});

// Reown AppKit for desktop wallet modal
export const wagmiAdapter = new WagmiAdapter({
  networks: [celo],
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [celo],
  projectId,
  features: { analytics: false },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#FFB800',
    '--w3m-color-mix': '#050505',
    '--w3m-color-mix-strength': 40,
  },
});

export const isMiniPay =
  typeof window !== 'undefined' &&
  (window.ethereum as { isMiniPay?: boolean } | undefined)?.isMiniPay === true;
