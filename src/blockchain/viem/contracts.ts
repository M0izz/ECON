import { parseAbi } from 'viem';

export const MONAD_CONTRACT_ADDRESSES = {
  // ERC-8004 Official Monad Registries
  erc8004Identity: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as `0x${string}`,
  erc8004Reputation: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as `0x${string}`,

  // ECON Core Protocol Contracts on Monad Testnet
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as `0x${string}`,
  economicObject: '0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802' as `0x${string}`,
  escrow: '0x62B9D90e964C108779951664c39832B6F9A27F03' as `0x${string}`,
} as const;

export const ECON_IDENTITY_REGISTRY_ABI = parseAbi([
  'function registerAgent(bytes32 agentId, bytes32 metadataHash) external',
  'function setStatus(bytes32 agentId, bool active) external',
  'function updateMetadata(bytes32 agentId, bytes32 newHash) external',
  'function isAgentActive(bytes32 agentId) external view returns (bool)',
  'function identities(bytes32) external view returns (address controller, bytes32 metadataHash, bool active, uint256 registeredAt)',
  'function walletToAgent(address) external view returns (bytes32)',
  'event AgentRegistered(bytes32 indexed agentId, address indexed controller, bytes32 metadataHash)',
  'event AgentStatusChanged(bytes32 indexed agentId, bool active)',
  'event MetadataUpdated(bytes32 indexed agentId, bytes32 newMetadataHash)',
]);

export const ECON_ECONOMIC_OBJECT_ABI = parseAbi([
  'function createObject(bytes32 id, uint8 objectType, uint256 value, uint256 expiry, bool transferable, bytes32 metadataHash) external',
  'function transferObject(bytes32 id, address newOwner) external',
  'function setStatus(bytes32 id, uint8 newStatus) external',
  'function objects(bytes32) external view returns (bytes32 id, address owner, uint8 objectType, uint256 value, uint256 expiry, bool transferable, uint8 status, bytes32 metadataHash)',
  'event ObjectCreated(bytes32 indexed id, address indexed owner, uint8 objectType, uint256 value)',
  'event ObjectTransferred(bytes32 indexed id, address indexed previousOwner, address indexed newOwner)',
  'event ObjectStatusUpdated(bytes32 indexed id, uint8 status)',
]);

export const ECON_ESCROW_ABI = parseAbi([
  'function lockEscrow(bytes32 id, address seller, bytes32 conditionHash, uint256 deadline) external payable',
  'function submitDelivery(bytes32 id, bytes32 deliveryProof) external',
  'function verifyAndRelease(bytes32 id) external',
  'function refund(bytes32 id) external',
  'function escrows(bytes32) external view returns (bytes32 id, address buyer, address seller, uint256 amount, bytes32 conditionHash, uint256 deadline, uint8 status)',
  'event EscrowLocked(bytes32 indexed id, address indexed buyer, address indexed seller, uint256 amount, uint256 deadline)',
  'event DeliverySubmitted(bytes32 indexed id, bytes32 deliveryProof)',
  'event EscrowReleased(bytes32 indexed id, address indexed seller, uint256 amount)',
  'event EscrowRefunded(bytes32 indexed id, address indexed buyer, uint256 amount)',
]);

export const ERC8004_REPUTATION_ABI = parseAbi([
  'function getReputation(bytes32 agentId) external view returns (uint256 score, uint256 evaluationsCount)',
  'function submitEvaluation(bytes32 agentId, uint8 score, bytes32 evidenceHash) external',
  'event EvaluationSubmitted(bytes32 indexed agentId, address indexed evaluator, uint8 score)',
]);
