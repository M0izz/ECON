/**
 * GraphQL Query definitions for Envio HyperIndex
 */

export const GET_RECENT_ECONOMIC_EVENTS = `
  query GetRecentEconomicEvents($limit: Int!, $offset: Int, $type: String, $actor: String) {
    EconomicEvent(
      limit: $limit
      offset: $offset
      order_by: { timestamp: desc }
      where: {
        _and: [
          { type: { _eq: $type } }
          { actor: { _ilike: $actor } }
        ]
      }
    ) {
      id
      type
      actor
      counterparty
      amount
      summary
      contractAddress
      txHash
      blockNumber
      timestamp
      relatedObjectId
      relatedEscrowId
    }
  }
`;

export const GET_AGENT_ECONOMIC_HISTORY = `
  query GetAgentEconomicHistory($agentId: String!, $limit: Int = 50) {
    Agent_by_pk(id: $agentId) {
      id
      controller
      metadataHash
      agentURI
      active
      registeredAt
      registeredBlock
      transactionCount
      totalVolumeMon
      txHash
    }
    events: EconomicEvent(
      where: {
        _or: [
          { actor: { _eq: $agentId } }
          { counterparty: { _eq: $agentId } }
        ]
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      type
      actor
      counterparty
      amount
      summary
      contractAddress
      txHash
      blockNumber
      timestamp
      relatedObjectId
      relatedEscrowId
    }
    creditReservations: CreditReservation(
      where: { agentId: { _eq: $agentId } }
      order_by: { createdAt: desc }
      limit: 20
    ) {
      id
      requester
      amount
      consumedAmount
      refundedAmount
      recycledAmount
      status
      createdAt
      settledAt
      txHash
    }
  }
`;

export const GET_ECONOMIC_OBJECT_HISTORY = `
  query GetEconomicObjectHistory($objectId: String!) {
    EconomicObject_by_pk(id: $objectId) {
      id
      owner
      objectType
      value
      expiry
      transferable
      status
      createdAt
      updatedAt
      txHash
      blockNumber
    }
    events: EconomicEvent(
      where: { relatedObjectId: { _eq: $objectId } }
      order_by: { timestamp: desc }
    ) {
      id
      type
      actor
      counterparty
      amount
      summary
      contractAddress
      txHash
      blockNumber
      timestamp
    }
    listings: MarketplaceListing(
      where: { objectId: { _eq: $objectId } }
      order_by: { listedAt: desc }
    ) {
      id
      seller
      buyer
      price
      fee
      active
      listedAt
      purchasedAt
      cancelledAt
      txHash
    }
    escrows: EscrowRecord(
      where: { linkedObjectId: { _eq: $objectId } }
      order_by: { createdAt: desc }
    ) {
      id
      buyer
      seller
      amount
      status
      createdAt
      releasedAt
      txHash
      blockNumber
    }
    recoveries: RecoveryRecord(
      where: { objectId: { _eq: $objectId } }
      order_by: { timestamp: desc }
    ) {
      id
      agent
      recoveryType
      recoveredValue
      status
      txHash
      blockNumber
      timestamp
    }
  }
`;

export const GET_MARKETPLACE_ACTIVITY = `
  query GetMarketplaceActivity($limit: Int = 25) {
    MarketplaceListing(
      order_by: { listedAt: desc }
      limit: $limit
    ) {
      id
      objectId
      seller
      buyer
      price
      fee
      active
      listedAt
      purchasedAt
      cancelledAt
      txHash
    }
    events: EconomicEvent(
      where: {
        type: { _in: ["OBJECT_LISTED", "OBJECT_PURCHASED", "LISTING_CANCELLED"] }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      type
      actor
      counterparty
      amount
      summary
      txHash
      blockNumber
      timestamp
      relatedObjectId
    }
  }
`;

export const GET_ESCROW_ACTIVITY = `
  query GetEscrowActivity($limit: Int = 25) {
    EscrowRecord(
      order_by: { createdAt: desc }
      limit: $limit
    ) {
      id
      buyer
      seller
      amount
      conditionHash
      deadline
      status
      linkedObjectId
      deliveryProof
      createdAt
      releasedAt
      refundedAt
      txHash
      blockNumber
    }
    events: EconomicEvent(
      where: {
        type: { _in: ["ESCROW_LOCKED", "ESCROW_DELIVERED", "ESCROW_RELEASED", "ESCROW_REFUNDED"] }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      type
      actor
      counterparty
      amount
      summary
      txHash
      blockNumber
      timestamp
      relatedEscrowId
    }
  }
`;

export const GET_RECOVERY_HISTORY = `
  query GetRecoveryHistory($limit: Int = 25) {
    RecoveryRecord(
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      objectId
      agent
      recoveryType
      recoveredValue
      status
      txHash
      blockNumber
      timestamp
    }
    events: EconomicEvent(
      where: { type: { _eq: "RECOVERY_EXECUTED" } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      type
      actor
      amount
      summary
      txHash
      blockNumber
      timestamp
      relatedObjectId
    }
  }
`;

export const GET_DAILY_ECONOMIC_METRICS = `
  query GetDailyEconomicMetrics($limit: Int = 30) {
    DailyEconomicMetric(
      order_by: { date: desc }
      limit: $limit
    ) {
      id
      date
      totalTransactions
      totalVolumeMon
      marketplaceVolumeMon
      escrowVolumeMon
      recoveredValueMon
      objectsCreated
      activeAgents
    }
  }
`;

export const GET_INDEXER_STATUS = `
  query GetIndexerStatus {
    _meta {
      status {
        is_synced
        latest_block
      }
    }
    EconomicEvent_aggregate {
      aggregate {
        count
      }
    }
  }
`;
