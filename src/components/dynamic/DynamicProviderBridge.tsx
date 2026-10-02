import React, { useEffect } from 'react';
import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import {
  monadTestnetDynamicNetwork,
  getDynamicEnvironmentId,
  isDynamicConfigured,
  globalDynamicWallet,
} from '../../integrations/dynamic';

interface DynamicBridgeProps {
  children: React.ReactNode;
}

/**
 * Inner synchronization component that listens to Dynamic's React context
 * and syncs the primary wallet with ECON's globalDynamicWallet singleton.
 */
const DynamicContextSync: React.FC = () => {
  const { primaryWallet, user, handleLogOut } = useDynamicContext();

  useEffect(() => {
    if (primaryWallet) {
      globalDynamicWallet.setActiveWallet(primaryWallet, user);
    } else {
      globalDynamicWallet.disconnect();
    }
  }, [primaryWallet, user]);

  return null;
};

/**
 * DynamicProviderBridge wraps ECON with DynamicContextProvider if an environment ID is set,
 * or gracefully renders children without breaking ECON if VITE_DYNAMIC_ENVIRONMENT_ID is absent.
 */
export const DynamicProviderBridge: React.FC<DynamicBridgeProps> = ({ children }) => {
  const envId = getDynamicEnvironmentId();
  const configured = isDynamicConfigured();

  if (!configured) {
    // Graceful degradation when VITE_DYNAMIC_ENVIRONMENT_ID is not configured
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: envId,
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          evmNetworks: (networks) => [
            ...networks.filter((n) => n.chainId !== monadTestnetDynamicNetwork.chainId),
            monadTestnetDynamicNetwork,
          ],
        },
      }}
    >
      <DynamicContextSync />
      {children}
    </DynamicContextProvider>
  );
};
