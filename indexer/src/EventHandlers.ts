/**
 * Envio HyperIndex Event Handlers for ECON on Monad Testnet
 * Protocol: Sovereign Autonomous Economic Operating Layer
 */

// Status mappings for ECON Economic Objects
export const OBJECT_STATUS = {
  0: 'ACTIVE',
  1: 'IN_ESCROW',
  2: 'STRANDED',
  3: 'RECOVERED',
  4: 'EXPIRED',
  5: 'LIQUIDATED',
} as const;

export type ObjectStatusString = typeof OBJECT_STATUS[keyof typeof OBJECT_STATUS];

/**
 * Pure handler logic functions that can be tested in isolation and bound to Envio lifecycle.
 */
export const handlers = {
  // --- ECONIdentityRegistry Handlers ---
  handleAgentRegistered: async (event: any, context: any) => {
    const { agentId, controller, metadataHash, agentURI } = event.params;
    const txHash = event.transaction?.hash || '0x0000000000000000000000000000000000000000000000000000000000000000';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const agent = {
      id: agentId,
      controller,
      metadataHash,
      agentURI: agentURI || '',
      active: true,
      registeredAt: timestamp,
      registeredBlock: blockNumber,
      transactionCount: 0n,
      totalVolumeMon: 0n,
      txHash,
    };
    context.Agent.set(agent);

    const eventId = `${txHash}_${event.logIndex ?? 0}`;
    context.EconomicEvent.set({
      id: eventId,
      type: 'AGENT_REGISTERED',
      actor: controller,
      counterparty: null,
      amount: 0n,
      summary: `Registered autonomous agent passport ${agentId.slice(0, 10)}...`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: null,
      relatedEscrowId: null,
    });
  },

  handleAgentStatusChanged: async (event: any, context: any) => {
    const { agentId, active } = event.params;
    const existing = await context.Agent.get(agentId);
    if (existing) {
      context.Agent.set({
        ...existing,
        active,
      });
    }

    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'AGENT_STATUS_CHANGED',
      actor: existing?.controller || 'controller',
      counterparty: null,
      amount: 0n,
      summary: `Agent ${agentId.slice(0, 10)}... status updated: ${active ? 'ACTIVE' : 'DEACTIVATED'}`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: null,
      relatedEscrowId: null,
    });
  },

  // --- ECONEconomicObject Handlers ---
  handleObjectCreated: async (event: any, context: any) => {
    const { id, owner, objectType, value } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const object = {
      id,
      owner,
      objectType: Number(objectType),
      value: BigInt(value),
      expiry: 0n,
      transferable: true,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
      txHash,
      blockNumber,
    };
    context.EconomicObject.set(object);

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'ECONOMIC_OBJECT_CREATED',
      actor: owner,
      counterparty: null,
      amount: BigInt(value),
      summary: `Created programmable economic object ${id.slice(0, 10)}... (${value} wei)`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: id,
      relatedEscrowId: null,
    });
  },

  handleObjectTransferred: async (event: any, context: any) => {
    const { id, previousOwner, newOwner } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.EconomicObject.get(id);
    if (existing) {
      context.EconomicObject.set({
        ...existing,
        owner: newOwner,
        updatedAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'OBJECT_TRANSFERRED',
      actor: previousOwner,
      counterparty: newOwner,
      amount: existing?.value || 0n,
      summary: `Transferred object ${id.slice(0, 10)}... to ${newOwner.slice(0, 8)}...`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: id,
      relatedEscrowId: null,
    });
  },

  handleObjectStatusUpdated: async (event: any, context: any) => {
    const { id, status } = event.params;
    const statusCode = Number(status);
    const statusStr = OBJECT_STATUS[statusCode as keyof typeof OBJECT_STATUS] || 'ACTIVE';
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.EconomicObject.get(id);
    if (existing) {
      context.EconomicObject.set({
        ...existing,
        status: statusStr,
        updatedAt: timestamp,
      });
    }

    // If status transitioned to RECOVERED (3), record in RecoveryRecord
    if (statusCode === 3) {
      context.RecoveryRecord.set({
        id: `REC_${id}_${blockNumber}`,
        objectId: id,
        agent: existing?.owner || 'unknown',
        recoveryType: 'STRANDED_YIELD_RECLAMATION',
        recoveredValue: existing?.value || 0n,
        status: 'EXECUTED',
        txHash,
        blockNumber,
        timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: statusCode === 3 ? 'RECOVERY_EXECUTED' : 'OBJECT_STATUS_UPDATED',
      actor: existing?.owner || 'owner',
      counterparty: null,
      amount: existing?.value || 0n,
      summary: statusCode === 3
        ? `GC executed recovery for object ${id.slice(0, 10)}...`
        : `Object ${id.slice(0, 10)}... marked as ${statusStr}`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: id,
      relatedEscrowId: null,
    });
  },

  // --- ECONEscrow Handlers ---
  handleEscrowLocked: async (event: any, context: any) => {
    const { id, buyer, seller, amount, conditionHash, deadline, linkedObjectId } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const escrow = {
      id,
      buyer,
      seller,
      amount: BigInt(amount),
      conditionHash,
      deadline: BigInt(deadline),
      status: 'LOCKED',
      linkedObjectId: linkedObjectId && linkedObjectId !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        ? linkedObjectId
        : null,
      deliveryProof: null,
      createdAt: timestamp,
      releasedAt: null,
      refundedAt: null,
      txHash,
      blockNumber,
    };
    context.EscrowRecord.set(escrow);

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'ESCROW_LOCKED',
      actor: buyer,
      counterparty: seller,
      amount: BigInt(amount),
      summary: `Locked ${amount} wei in conditional escrow ${id.slice(0, 10)}...`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: linkedObjectId || null,
      relatedEscrowId: id,
    });
  },

  handleDeliverySubmitted: async (event: any, context: any) => {
    const { id, deliveryProof } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.EscrowRecord.get(id);
    if (existing) {
      context.EscrowRecord.set({
        ...existing,
        status: 'DELIVERED',
        deliveryProof,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'ESCROW_DELIVERED',
      actor: existing?.seller || 'seller',
      counterparty: existing?.buyer || null,
      amount: existing?.amount || 0n,
      summary: `Submitted delivery proof for escrow ${id.slice(0, 10)}...`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: existing?.linkedObjectId || null,
      relatedEscrowId: id,
    });
  },

  handleEscrowReleased: async (event: any, context: any) => {
    const { id, seller, amount, linkedObjectId } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.EscrowRecord.get(id);
    if (existing) {
      context.EscrowRecord.set({
        ...existing,
        status: 'RELEASED',
        releasedAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'ESCROW_RELEASED',
      actor: existing?.buyer || 'buyer',
      counterparty: seller,
      amount: BigInt(amount),
      summary: `Released escrow settlement of ${amount} wei to seller ${seller.slice(0, 8)}...`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: linkedObjectId || existing?.linkedObjectId || null,
      relatedEscrowId: id,
    });
  },

  handleEscrowRefunded: async (event: any, context: any) => {
    const { id, buyer, amount } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.EscrowRecord.get(id);
    if (existing) {
      context.EscrowRecord.set({
        ...existing,
        status: 'REFUNDED',
        refundedAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'ESCROW_REFUNDED',
      actor: buyer,
      counterparty: existing?.seller || null,
      amount: BigInt(amount),
      summary: `Refunded escrow ${id.slice(0, 10)}... to buyer (${amount} wei)`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: existing?.linkedObjectId || null,
      relatedEscrowId: id,
    });
  },

  // --- ECONMarketplace Handlers ---
  handleObjectListed: async (event: any, context: any) => {
    const { listingId, objectId, seller, price, listedAt } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? listedAt ?? 0);

    const listing = {
      id: listingId,
      objectId,
      seller,
      buyer: null,
      price: BigInt(price),
      fee: null,
      active: true,
      listedAt: BigInt(listedAt),
      purchasedAt: null,
      cancelledAt: null,
      txHash,
    };
    context.MarketplaceListing.set(listing);

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'OBJECT_LISTED',
      actor: seller,
      counterparty: null,
      amount: BigInt(price),
      summary: `Listed object ${objectId.slice(0, 10)}... for ${price} wei`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: objectId,
      relatedEscrowId: null,
    });
  },

  handleListingCancelled: async (event: any, context: any) => {
    const { listingId, objectId, seller } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.MarketplaceListing.get(listingId);
    if (existing) {
      context.MarketplaceListing.set({
        ...existing,
        active: false,
        cancelledAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'LISTING_CANCELLED',
      actor: seller,
      counterparty: null,
      amount: existing?.price || 0n,
      summary: `Cancelled marketplace listing for object ${objectId.slice(0, 10)}...`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: objectId,
      relatedEscrowId: null,
    });
  },

  handleObjectPurchased: async (event: any, context: any) => {
    const { listingId, objectId, buyer, seller, price, fee } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.MarketplaceListing.get(listingId);
    if (existing) {
      context.MarketplaceListing.set({
        ...existing,
        active: false,
        buyer,
        fee: BigInt(fee),
        purchasedAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'OBJECT_PURCHASED',
      actor: buyer,
      counterparty: seller,
      amount: BigInt(price),
      summary: `Purchased object ${objectId.slice(0, 10)}... for ${price} wei (protocol fee: ${fee} wei)`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: objectId,
      relatedEscrowId: null,
    });
  },

  // --- ECONCreditVault Handlers ---
  handleCreditsReserved: async (event: any, context: any) => {
    const { reservationId, agentId, requester, amount, expiresAt } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const reservation = {
      id: reservationId,
      agentId,
      requester,
      amount: BigInt(amount),
      consumedAmount: 0n,
      refundedAmount: 0n,
      recycledAmount: 0n,
      status: 'RESERVED',
      createdAt: timestamp,
      settledAt: null,
      txHash,
    };
    context.CreditReservation.set(reservation);

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'CREDITS_RESERVED',
      actor: requester,
      counterparty: agentId,
      amount: BigInt(amount),
      summary: `Reserved ${amount} credits for agent ${agentId}`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: null,
      relatedEscrowId: null,
    });
  },

  handleReservationSettled: async (event: any, context: any) => {
    const { reservationId, agentId, requester, consumedAmount, refundedAmount } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.CreditReservation.get(reservationId);
    if (existing) {
      context.CreditReservation.set({
        ...existing,
        consumedAmount: BigInt(consumedAmount),
        refundedAmount: BigInt(refundedAmount),
        status: 'SETTLED',
        settledAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'RESERVATION_SETTLED',
      actor: agentId,
      counterparty: requester,
      amount: BigInt(consumedAmount),
      summary: `Settled reservation: consumed ${consumedAmount} credits, refunded ${refundedAmount} credits`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: null,
      relatedEscrowId: null,
    });
  },

  handleReservationReleased: async (event: any, context: any) => {
    const { reservationId, agentId, requester, refundedAmount } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.CreditReservation.get(reservationId);
    if (existing) {
      context.CreditReservation.set({
        ...existing,
        refundedAmount: BigInt(refundedAmount),
        status: 'RELEASED',
        settledAt: timestamp,
      });
    }

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'RESERVATION_RELEASED',
      actor: requester,
      counterparty: agentId,
      amount: BigInt(refundedAmount),
      summary: `Released reservation of ${refundedAmount} credits back to requester`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: null,
      relatedEscrowId: null,
    });
  },

  handleReservationRecycled: async (event: any, context: any) => {
    const { reservationId, agentId, recycledAmount } = event.params;
    const txHash = event.transaction?.hash || '0x';
    const blockNumber = BigInt(event.block?.number ?? event.block?.height ?? 0);
    const timestamp = BigInt(event.block?.timestamp ?? 0);

    const existing = await context.CreditReservation.get(reservationId);
    if (existing) {
      context.CreditReservation.set({
        ...existing,
        recycledAmount: BigInt(recycledAmount),
        status: 'RECYCLED',
        settledAt: timestamp,
      });
    }

    // GC records recycled capacity as recovered value
    context.RecoveryRecord.set({
      id: `REC_CREDIT_${reservationId}_${blockNumber}`,
      objectId: reservationId,
      agent: agentId,
      recoveryType: 'CREDIT_POOL_RECYCLING',
      recoveredValue: BigInt(recycledAmount),
      status: 'EXECUTED',
      txHash,
      blockNumber,
      timestamp,
    });

    context.EconomicEvent.set({
      id: `${txHash}_${event.logIndex ?? 0}`,
      type: 'RECOVERY_EXECUTED',
      actor: agentId,
      counterparty: null,
      amount: BigInt(recycledAmount),
      summary: `GC recycled ${recycledAmount} unused credits into common pool`,
      contractAddress: event.srcAddress,
      txHash,
      blockNumber,
      timestamp,
      relatedObjectId: null,
      relatedEscrowId: null,
    });
  },
};

/**
 * Envio runtime binding:
 * If generated Envio environment is present (after `envio codegen`), bind to Envio contract event hooks.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const generated = require('../generated');
  if (generated && generated.ECONIdentityRegistry) {
    generated.ECONIdentityRegistry.AgentRegistered.handler(handlers.handleAgentRegistered);
    generated.ECONIdentityRegistry.AgentStatusChanged.handler(handlers.handleAgentStatusChanged);

    generated.ECONEconomicObject.ObjectCreated.handler(handlers.handleObjectCreated);
    generated.ECONEconomicObject.ObjectTransferred.handler(handlers.handleObjectTransferred);
    generated.ECONEconomicObject.ObjectStatusUpdated.handler(handlers.handleObjectStatusUpdated);

    generated.ECONEscrow.EscrowLocked.handler(handlers.handleEscrowLocked);
    generated.ECONEscrow.DeliverySubmitted.handler(handlers.handleDeliverySubmitted);
    generated.ECONEscrow.EscrowReleased.handler(handlers.handleEscrowReleased);
    generated.ECONEscrow.EscrowRefunded.handler(handlers.handleEscrowRefunded);

    generated.ECONMarketplace.ObjectListed.handler(handlers.handleObjectListed);
    generated.ECONMarketplace.ListingCancelled.handler(handlers.handleListingCancelled);
    generated.ECONMarketplace.ObjectPurchased.handler(handlers.handleObjectPurchased);

    generated.ECONCreditVault.CreditsReserved.handler(handlers.handleCreditsReserved);
    generated.ECONCreditVault.ReservationSettled.handler(handlers.handleReservationSettled);
    generated.ECONCreditVault.ReservationReleased.handler(handlers.handleReservationReleased);
    generated.ECONCreditVault.ReservationRecycled.handler(handlers.handleReservationRecycled);
  }
} catch {
  // In pre-codegen or unit test harness, handlers are invoked directly via export
}
