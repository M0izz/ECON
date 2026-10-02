import { describe, it, expect, beforeEach } from 'vitest';
import { handlers } from '../src/EventHandlers';

class MockContext {
  public store: Record<string, Map<string, any>> = {
    Agent: new Map(),
    EconomicObject: new Map(),
    MarketplaceListing: new Map(),
    EscrowRecord: new Map(),
    CreditReservation: new Map(),
    RecoveryRecord: new Map(),
    EconomicEvent: new Map(),
    DailyEconomicMetric: new Map(),
  };

  public Agent = {
    get: async (id: string) => this.store.Agent.get(id),
    set: (entity: any) => this.store.Agent.set(entity.id, entity),
  };

  public EconomicObject = {
    get: async (id: string) => this.store.EconomicObject.get(id),
    set: (entity: any) => this.store.EconomicObject.set(entity.id, entity),
  };

  public MarketplaceListing = {
    get: async (id: string) => this.store.MarketplaceListing.get(id),
    set: (entity: any) => this.store.MarketplaceListing.set(entity.id, entity),
  };

  public EscrowRecord = {
    get: async (id: string) => this.store.EscrowRecord.get(id),
    set: (entity: any) => this.store.EscrowRecord.set(entity.id, entity),
  };

  public CreditReservation = {
    get: async (id: string) => this.store.CreditReservation.get(id),
    set: (entity: any) => this.store.CreditReservation.set(entity.id, entity),
  };

  public RecoveryRecord = {
    get: async (id: string) => this.store.RecoveryRecord.get(id),
    set: (entity: any) => this.store.RecoveryRecord.set(entity.id, entity),
  };

  public EconomicEvent = {
    get: async (id: string) => this.store.EconomicEvent.get(id),
    set: (entity: any) => this.store.EconomicEvent.set(entity.id, entity),
  };
}

describe('Envio HyperIndex Handlers for ECON on Monad Testnet', () => {
  let context: MockContext;

  beforeEach(() => {
    context = new MockContext();
  });

  it('handleAgentRegistered indexes new Agent passport and emits EconomicEvent', async () => {
    const event = {
      params: {
        agentId: '0x1111111111111111111111111111111111111111111111111111111111111111',
        controller: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        metadataHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        agentURI: 'ipfs://bafybeieconagent42',
      },
      transaction: { hash: '0xabc1230000000000000000000000000000000000000000000000000000000001' },
      block: { number: 1042301, timestamp: 1735689600 },
      logIndex: 0,
      srcAddress: '0x8004A818b43A4F469612C57cEC58c9735D1e1234',
    };

    await handlers.handleAgentRegistered(event, context);

    const agent = await context.Agent.get(event.params.agentId);
    expect(agent).toBeDefined();
    expect(agent?.controller).toBe(event.params.controller);
    expect(agent?.active).toBe(true);
    expect(agent?.registeredBlock).toBe(1042301n);
    expect(agent?.txHash).toBe(event.transaction.hash);

    const events = Array.from(context.store.EconomicEvent.values());
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('AGENT_REGISTERED');
    expect(events[0].actor).toBe(event.params.controller);
    expect(events[0].txHash).toBe(event.transaction.hash);
  });

  it('handleObjectCreated and handleObjectTransferred track ownership lifecycle', async () => {
    const objId = '0xobj0000000000000000000000000000000000000000000000000000000000001';
    const ownerA = '0x1111111111111111111111111111111111111111';
    const ownerB = '0x2222222222222222222222222222222222222222';

    // 1. Create object
    await handlers.handleObjectCreated(
      {
        params: { id: objId, owner: ownerA, objectType: 1, value: 5000000000000000000n },
        transaction: { hash: '0xtx1' },
        block: { number: 100, timestamp: 1000 },
        logIndex: 0,
        srcAddress: '0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802',
      },
      context
    );

    let obj = await context.EconomicObject.get(objId);
    expect(obj).toBeDefined();
    expect(obj?.owner).toBe(ownerA);
    expect(obj?.value).toBe(5000000000000000000n);
    expect(obj?.status).toBe('ACTIVE');

    // 2. Transfer object to ownerB
    await handlers.handleObjectTransferred(
      {
        params: { id: objId, previousOwner: ownerA, newOwner: ownerB },
        transaction: { hash: '0xtx2' },
        block: { number: 105, timestamp: 1050 },
        logIndex: 0,
        srcAddress: '0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802',
      },
      context
    );

    obj = await context.EconomicObject.get(objId);
    expect(obj?.owner).toBe(ownerB);
    expect(obj?.updatedAt).toBe(1050n);
  });

  it('handleObjectStatusUpdated records RECOVERY_RECORD when asset is recovered by GC', async () => {
    const objId = '0xobj0000000000000000000000000000000000000000000000000000000000002';
    await handlers.handleObjectCreated(
      {
        params: { id: objId, owner: '0xOwner', objectType: 2, value: 4600000000000000000n },
        transaction: { hash: '0xcreate' },
        block: { number: 200, timestamp: 2000 },
        logIndex: 0,
        srcAddress: '0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802',
      },
      context
    );

    // Update status to RECOVERED (status code 3)
    await handlers.handleObjectStatusUpdated(
      {
        params: { id: objId, status: 3 },
        transaction: { hash: '0xrecoveryTx' },
        block: { number: 250, timestamp: 2500 },
        logIndex: 1,
        srcAddress: '0x39F494E03d3f9b2A4C2a01D7aB4BFe5aDe71C802',
      },
      context
    );

    const obj = await context.EconomicObject.get(objId);
    expect(obj?.status).toBe('RECOVERED');

    const recoveries = Array.from(context.store.RecoveryRecord.values());
    expect(recoveries.length).toBe(1);
    expect(recoveries[0].objectId).toBe(objId);
    expect(recoveries[0].recoveredValue).toBe(4600000000000000000n);
    expect(recoveries[0].status).toBe('EXECUTED');
    expect(recoveries[0].txHash).toBe('0xrecoveryTx');
  });

  it('Escrow flow: EscrowLocked -> DeliverySubmitted -> EscrowReleased preserves full audit state', async () => {
    const escrowId = '0xescrow0000000000000000000000000000000000000000000000000000000001';
    const buyer = '0xBuyerAddress0000000000000000000000000001';
    const seller = '0xSellerAddress0000000000000000000000000002';
    const amount = 12000000000000000000n; // 12 MON

    // 1. Lock Escrow
    await handlers.handleEscrowLocked(
      {
        params: {
          id: escrowId,
          buyer,
          seller,
          amount,
          conditionHash: '0xcond',
          deadline: 2000000,
          linkedObjectId: '0xobj1',
        },
        transaction: { hash: '0xlockTx' },
        block: { number: 300, timestamp: 3000 },
        logIndex: 0,
        srcAddress: '0x62B9D90e964C108779951664c39832B6F9A27F03',
      },
      context
    );

    let escrow = await context.EscrowRecord.get(escrowId);
    expect(escrow?.status).toBe('LOCKED');
    expect(escrow?.amount).toBe(amount);

    // 2. Submit Delivery
    await handlers.handleDeliverySubmitted(
      {
        params: { id: escrowId, deliveryProof: '0xproofHash' },
        transaction: { hash: '0xdeliveryTx' },
        block: { number: 310, timestamp: 3100 },
        logIndex: 0,
        srcAddress: '0x62B9D90e964C108779951664c39832B6F9A27F03',
      },
      context
    );

    escrow = await context.EscrowRecord.get(escrowId);
    expect(escrow?.status).toBe('DELIVERED');
    expect(escrow?.deliveryProof).toBe('0xproofHash');

    // 3. Release Escrow
    await handlers.handleEscrowReleased(
      {
        params: { id: escrowId, seller, amount, linkedObjectId: '0xobj1' },
        transaction: { hash: '0xreleaseTx' },
        block: { number: 320, timestamp: 3200 },
        logIndex: 0,
        srcAddress: '0x62B9D90e964C108779951664c39832B6F9A27F03',
      },
      context
    );

    escrow = await context.EscrowRecord.get(escrowId);
    expect(escrow?.status).toBe('RELEASED');
    expect(escrow?.releasedAt).toBe(3200n);
  });

  it('Marketplace flow: ObjectListed -> ObjectPurchased records buyer and protocol fee', async () => {
    const listingId = '0xlist000000000000000000000000000000000000000000000000000000000001';
    const objectId = '0xobj0000000000000000000000000000000000000000000000000000000000003';
    const seller = '0xSeller1';
    const buyer = '0xBuyer1';
    const price = 7800000000000000000n; // 7.8 MON
    const fee = 78000000000000000n; // 1% fee = 0.078 MON

    // 1. List
    await handlers.handleObjectListed(
      {
        params: { listingId, objectId, seller, price, listedAt: 4000 },
        transaction: { hash: '0xlistTx' },
        block: { number: 400, timestamp: 4000 },
        logIndex: 0,
        srcAddress: '0x49B3C8e7456dE1279A818D5D5d78F49F1823d041',
      },
      context
    );

    let listing = await context.MarketplaceListing.get(listingId);
    expect(listing?.active).toBe(true);
    expect(listing?.price).toBe(price);

    // 2. Buy
    await handlers.handleObjectPurchased(
      {
        params: { listingId, objectId, buyer, seller, price, fee },
        transaction: { hash: '0xbuyTx' },
        block: { number: 410, timestamp: 4100 },
        logIndex: 0,
        srcAddress: '0x49B3C8e7456dE1279A818D5D5d78F49F1823d041',
      },
      context
    );

    listing = await context.MarketplaceListing.get(listingId);
    expect(listing?.active).toBe(false);
    expect(listing?.buyer).toBe(buyer);
    expect(listing?.fee).toBe(fee);
    expect(listing?.purchasedAt).toBe(4100n);
  });

  it('Credit Vault flow: CreditsReserved -> ReservationRecycled generates recovery record', async () => {
    const reservationId = '0xres000000000000000000000000000000000000000000000000000000000001';
    const agentId = 'ComputeAgent-7';
    const requester = '0xRequester';
    const amount = 5000000000000000000n;

    await handlers.handleCreditsReserved(
      {
        params: { reservationId, agentId, requester, amount, expiresAt: 5000 },
        transaction: { hash: '0xresTx' },
        block: { number: 500, timestamp: 4500 },
        logIndex: 0,
        srcAddress: '0x7E3a8451D879F439fDa744747B0593B6Eda30022',
      },
      context
    );

    await handlers.handleReservationRecycled(
      {
        params: { reservationId, agentId, recycledAmount: amount },
        transaction: { hash: '0xrecycleTx' },
        block: { number: 550, timestamp: 5100 },
        logIndex: 0,
        srcAddress: '0x7E3a8451D879F439fDa744747B0593B6Eda30022',
      },
      context
    );

    const reservation = await context.CreditReservation.get(reservationId);
    expect(reservation?.status).toBe('RECYCLED');
    expect(reservation?.recycledAmount).toBe(amount);

    const recoveries = Array.from(context.store.RecoveryRecord.values());
    expect(recoveries.some((r) => r.recoveryType === 'CREDIT_POOL_RECYCLING')).toBe(true);
  });
});
