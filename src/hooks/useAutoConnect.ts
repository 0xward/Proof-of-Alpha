import { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';

/**
 * Automatically connects the first available connector (injected / MiniPay).
 * MiniPay injects window.ethereum and prohibits manual connect buttons,
 * so this hook satisfies that hard requirement silently on mount.
 */
export function useAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors.length]);
}
