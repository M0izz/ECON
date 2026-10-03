// ECON Smart Contract Addresses on Monad Testnet (Chain ID: 10143)

export interface ContractAddressConfig {
  identityRegistry: `0x${string}`;
  economicObject: `0x${string}`;
  escrow: `0x${string}`;
  marketplace: `0x${string}`;
  creditVault: `0x${string}`;
}

export const MONAD_TESTNET_ADDRESSES: ContractAddressConfig = {
  identityRegistry: '0x8004A818b43A4F469612C57cEC58c9735D1e1234',
  economicObject: '0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802',
  escrow: '0x62B9D90e964C108779951664c39832B6F9A27F03',
  marketplace: '0x49B3C8e7456dE1279A818D5D5d78F49F1823d041',
  creditVault: '0x7E3a8451D879F439fDa744747B0593B6Eda30022',
};

export const CONTRACT_ADDRESSES = {
  ECONIdentityRegistry: MONAD_TESTNET_ADDRESSES.identityRegistry,
  ECONEconomicObject: MONAD_TESTNET_ADDRESSES.economicObject,
  ECONEscrow: MONAD_TESTNET_ADDRESSES.escrow,
  ECONMarketplace: MONAD_TESTNET_ADDRESSES.marketplace,
  ECONCreditVault: MONAD_TESTNET_ADDRESSES.creditVault,
};

export const MONAD_EXPLORER_BASE = 'https://testnet.monadexplorer.com';
