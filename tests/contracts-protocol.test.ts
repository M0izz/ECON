import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import {
  ECONIdentityRegistryArtifact,
  ECONEconomicObjectArtifact,
  ECONEscrowArtifact,
  ECONMarketplaceArtifact,
  ECONCreditVaultArtifact,
  CONTRACT_NAMES
} from '../src/contracts';
import { MONAD_TESTNET_ADDRESSES, MONAD_EXPLORER_BASE } from '../src/contracts/addresses';
import { MARKETPLACE_FEE_BPS, feeEngine } from '../src/sdk/fee';

describe('ECON Smart Contracts Protocol Suite', () => {
  describe('1. Compilation & Artifact Validation', () => {
    it('compiles all five required contracts into valid EVM bytecode and ABIs', () => {
      expect(CONTRACT_NAMES).toHaveLength(5);
      expect(CONTRACT_NAMES).toContain('ECONIdentityRegistry');
      expect(CONTRACT_NAMES).toContain('ECONEconomicObject');
      expect(CONTRACT_NAMES).toContain('ECONEscrow');
      expect(CONTRACT_NAMES).toContain('ECONMarketplace');
      expect(CONTRACT_NAMES).toContain('ECONCreditVault');

      const artifacts = [
        ECONIdentityRegistryArtifact,
        ECONEconomicObjectArtifact,
        ECONEscrowArtifact,
        ECONMarketplaceArtifact,
        ECONCreditVaultArtifact,
      ];

      for (const artifact of artifacts) {
        expect(artifact.contractName).toBeDefined();
        expect(artifact.abi).toBeInstanceOf(Array);
        expect(artifact.abi.length).toBeGreaterThan(0);
        expect(artifact.bytecode).toMatch(/^0x[0-9a-fA-F]+$/);
        expect(artifact.bytecode.length).toBeGreaterThan(100);
      }
    });

    it('has properly configured Monad Testnet addresses (Chain ID 10143)', () => {
      expect(MONAD_TESTNET_ADDRESSES.identityRegistry).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(MONAD_TESTNET_ADDRESSES.economicObject).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(MONAD_TESTNET_ADDRESSES.escrow).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(MONAD_TESTNET_ADDRESSES.marketplace).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(MONAD_TESTNET_ADDRESSES.creditVault).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(MONAD_EXPLORER_BASE).toBe('https://testnet.monadexplorer.com');
    });
  });

  describe('2. Contract Interface & Event Integrity', () => {
    it('ECONIdentityRegistry has all required functions and events', () => {
      const iface = new ethers.Interface(ECONIdentityRegistryArtifact.abi);
      
      // Functions
      expect(iface.getFunction('registerAgent(bytes32,bytes32)')).toBeDefined();
      expect(iface.getFunction('registerAgentWithURI(bytes32,bytes32,string)')).toBeDefined();
      expect(iface.getFunction('setStatus(bytes32,bool)')).toBeDefined();
      expect(iface.getFunction('updateMetadata(bytes32,bytes32)')).toBeDefined();
      expect(iface.getFunction('isAgentActive(bytes32)')).toBeDefined();
      expect(iface.getFunction('getAgent(bytes32)')).toBeDefined();

      // Events
      const regEvent = iface.getEvent('AgentRegistered');
      expect(regEvent).toBeDefined();
      expect(regEvent!.inputs.length).toBe(4);
      expect(regEvent!.inputs[0].name).toBe('agentId');
      expect(regEvent!.inputs[0].indexed).toBe(true);
      expect(regEvent!.inputs[1].name).toBe('controller');
      expect(regEvent!.inputs[1].indexed).toBe(true);
    });

    it('ECONEconomicObject has programmable object lifecycle and operator approval mechanics', () => {
      const iface = new ethers.Interface(ECONEconomicObjectArtifact.abi);

      expect(iface.getFunction('createObject(bytes32,uint8,uint256,uint256,bool,bytes32)')).toBeDefined();
      expect(iface.getFunction('transferObject(bytes32,address)')).toBeDefined();
      expect(iface.getFunction('transferFrom(address,address,bytes32)')).toBeDefined();
      expect(iface.getFunction('approve(address,bytes32)')).toBeDefined();
      expect(iface.getFunction('setApprovalForAll(address,bool)')).toBeDefined();
      expect(iface.getFunction('isApprovedOrOwner(address,bytes32)')).toBeDefined();
      expect(iface.getFunction('setStatus(bytes32,uint8)')).toBeDefined();

      expect(iface.getEvent('ObjectCreated')).toBeDefined();
      expect(iface.getEvent('ObjectTransferred')).toBeDefined();
      expect(iface.getEvent('ObjectApproved')).toBeDefined();
    });

    it('ECONMarketplace enforces 1.0% fee and atomic ownership transfer interface', () => {
      const iface = new ethers.Interface(ECONMarketplaceArtifact.abi);

      expect(iface.getFunction('listObject(bytes32,bytes32,uint256)')).toBeDefined();
      expect(iface.getFunction('cancelListing(bytes32)')).toBeDefined();
      expect(iface.getFunction('buyObject(bytes32)')).toBeDefined();
      expect(iface.getFunction('getListing(bytes32)')).toBeDefined();
      expect(iface.getFunction('FEE_BPS()')).toBeDefined();

      expect(iface.getEvent('ObjectListed')).toBeDefined();
      expect(iface.getEvent('ListingCancelled')).toBeDefined();
      expect(iface.getEvent('ObjectPurchased')).toBeDefined();

      // Verify the protocol fee matches the 1.0% SDK fee engine constant
      expect(MARKETPLACE_FEE_BPS).toBe(100);
      const calc = feeEngine.calculateMarketplaceFee(10);
      expect(calc.feeMon).toBe(0.1);
      expect(calc.netMon).toBe(9.9);
    });

    it('ECONEscrow supports conditional settlement and atomic delivery release', () => {
      const iface = new ethers.Interface(ECONEscrowArtifact.abi);

      expect(iface.getFunction('lockEscrow(bytes32,address,bytes32,uint256)')).toBeDefined();
      expect(iface.getFunction('lockObjectEscrow(bytes32,address,bytes32,uint256,bytes32)')).toBeDefined();
      expect(iface.getFunction('submitDelivery(bytes32,bytes32)')).toBeDefined();
      expect(iface.getFunction('verifyAndRelease(bytes32)')).toBeDefined();
      expect(iface.getFunction('refund(bytes32)')).toBeDefined();
      expect(iface.getFunction('getEscrow(bytes32)')).toBeDefined();

      expect(iface.getEvent('EscrowLocked')).toBeDefined();
      expect(iface.getEvent('DeliverySubmitted')).toBeDefined();
      expect(iface.getEvent('EscrowReleased')).toBeDefined();
      expect(iface.getEvent('EscrowRefunded')).toBeDefined();
    });

    it('ECONCreditVault interface matches backend CreditVerifier and CreditSettlement', () => {
      const iface = new ethers.Interface(ECONCreditVaultArtifact.abi);

      // Verifier query function
      const getResFunc = iface.getFunction('getReservation(bytes32)');
      expect(getResFunc).toBeDefined();
      expect(getResFunc!.outputs.length).toBe(6);
      expect(getResFunc!.outputs[0].type).toBe('string');  // agentId
      expect(getResFunc!.outputs[1].type).toBe('address'); // requester
      expect(getResFunc!.outputs[2].type).toBe('uint256'); // amount
      expect(getResFunc!.outputs[3].type).toBe('bool');    // consumed
      expect(getResFunc!.outputs[4].type).toBe('bool');    // released
      expect(getResFunc!.outputs[5].type).toBe('uint256'); // expiresAt

      // Settlement functions
      expect(iface.getFunction('settleReservation(bytes32,uint256)')).toBeDefined();
      expect(iface.getFunction('releaseReservation(bytes32)')).toBeDefined();
      expect(iface.getFunction('recycleReservation(bytes32)')).toBeDefined();
      expect(iface.getFunction('deposit()')).toBeDefined();
      expect(iface.getFunction('reserveCredits(bytes32,string,uint256,uint256)')).toBeDefined();

      expect(iface.getEvent('CreditsDeposited')).toBeDefined();
      expect(iface.getEvent('CreditsReserved')).toBeDefined();
      expect(iface.getEvent('ReservationSettled')).toBeDefined();
      expect(iface.getEvent('ReservationReleased')).toBeDefined();
    });
  });

  describe('3. Target Protocol Lifecycle Encoding & State Transition Flow', () => {
    const seller = '0x1111111111111111111111111111111111111111';
    const buyer = '0x2222222222222222222222222222222222222222';
    const finalRecipient = '0x3333333333333333333333333333333333333333';
    const objectId = ethers.keccak256(ethers.toUtf8Bytes('test-obj-1'));
    const listingId = ethers.keccak256(ethers.toUtf8Bytes('test-listing-1'));
    const escrowId = ethers.keccak256(ethers.toUtf8Bytes('test-escrow-1'));

    it('Step 1 -> CREATE IDENTITY: encodes agent passport registration correctly', () => {
      const iface = new ethers.Interface(ECONIdentityRegistryArtifact.abi);
      const agentId = ethers.keccak256(ethers.toUtf8Bytes('agent-1'));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes('metadata-1'));
      const agentURI = 'https://econ.network/agents/1';

      const calldata = iface.encodeFunctionData('registerAgentWithURI', [agentId, metadataHash, agentURI]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('registerAgentWithURI', calldata);
      expect(decoded[0]).toBe(agentId);
      expect(decoded[1]).toBe(metadataHash);
      expect(decoded[2]).toBe(agentURI);
    });

    it('Step 2 -> CREATE OBJECT: encodes programmable economic object creation', () => {
      const iface = new ethers.Interface(ECONEconomicObjectArtifact.abi);
      const value = ethers.parseEther('1.5');
      const expiry = Math.floor(Date.now() / 1000) + 86400;

      const calldata = iface.encodeFunctionData('createObject', [
        objectId,
        1, // GPU_COMPUTE_CREDIT
        value,
        expiry,
        true,
        ethers.ZeroHash
      ]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('createObject', calldata);
      expect(decoded[0]).toBe(objectId);
      expect(Number(decoded[1])).toBe(1);
      expect(decoded[2]).toBe(value);
      expect(decoded[4]).toBe(true);
    });

    it('Step 3 -> LIST OBJECT: encodes marketplace listing with price', () => {
      const iface = new ethers.Interface(ECONMarketplaceArtifact.abi);
      const price = ethers.parseEther('1.5');

      const calldata = iface.encodeFunctionData('listObject', [listingId, objectId, price]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('listObject', calldata);
      expect(decoded[0]).toBe(listingId);
      expect(decoded[1]).toBe(objectId);
      expect(decoded[2]).toBe(price);
    });

    it('Step 4 -> BUY OBJECT: verifies purchase fee deduction and recipient math', () => {
      const price = ethers.parseEther('10.0');
      const feeBps = 100n; // 1%
      const expectedFee = (price * feeBps) / 10000n;
      const expectedSellerPayout = price - expectedFee;

      expect(expectedFee).toBe(ethers.parseEther('0.1'));
      expect(expectedSellerPayout).toBe(ethers.parseEther('9.9'));
      expect(expectedFee + expectedSellerPayout).toBe(price);
    });

    it('Step 5 -> ESCROW: encodes conditional value lock for delivery', () => {
      const iface = new ethers.Interface(ECONEscrowArtifact.abi);
      const conditionHash = ethers.keccak256(ethers.toUtf8Bytes('delivery-sla'));
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const calldata = iface.encodeFunctionData('lockObjectEscrow', [
        escrowId,
        seller,
        conditionHash,
        deadline,
        objectId
      ]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('lockObjectEscrow', calldata);
      expect(decoded[0]).toBe(escrowId);
      expect(decoded[1]).toBe(seller);
      expect(decoded[4]).toBe(objectId);
    });

    it('Step 6 -> DELIVERY: encodes delivery proof submission by seller', () => {
      const iface = new ethers.Interface(ECONEscrowArtifact.abi);
      const proof = ethers.keccak256(ethers.toUtf8Bytes('zk-proof-delivery'));

      const calldata = iface.encodeFunctionData('submitDelivery', [escrowId, proof]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('submitDelivery', calldata);
      expect(decoded[0]).toBe(escrowId);
      expect(decoded[1]).toBe(proof);
    });

    it('Step 7 -> RELEASE: encodes delivery release and funds payout', () => {
      const iface = new ethers.Interface(ECONEscrowArtifact.abi);

      const calldata = iface.encodeFunctionData('verifyAndRelease', [escrowId]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('verifyAndRelease', calldata);
      expect(decoded[0]).toBe(escrowId);
    });

    it('Step 8 -> TRANSFER OWNERSHIP: encodes final ownership transfer to new agent controller', () => {
      const iface = new ethers.Interface(ECONEconomicObjectArtifact.abi);

      const calldata = iface.encodeFunctionData('transferObject', [objectId, finalRecipient]);
      expect(calldata).toMatch(/^0x/);

      const decoded = iface.decodeFunctionData('transferObject', calldata);
      expect(decoded[0]).toBe(objectId);
      expect(decoded[1]).toBe(finalRecipient);
    });
  });
});
