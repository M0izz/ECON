import {
  EconomicIntelligence,
  NansenLabel,
  NansenBalance,
  NansenTransaction,
  NansenCounterparty,
  NansenRelatedWallet,
} from './nansenTypes';

/**
 * Normalizes raw Nansen labels payload into typed NansenLabel array.
 */
export function mapNansenLabels(raw: unknown): NansenLabel[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as any).data)
    ? (raw as any).data
    : typeof raw === 'object' && Array.isArray((raw as any).labels)
    ? (raw as any).labels
    : [];

  return list
    .map((item: any) => {
      if (typeof item === 'string') {
        return { label: item, category: 'General', source: 'nansen' };
      }
      if (typeof item === 'object' && item !== null) {
        return {
          label: item.label || item.name || item.tag || 'Unknown',
          category: item.category || item.type || 'Behavioral',
          type: item.type,
          source: 'nansen',
        };
      }
      return null;
    })
    .filter((l: NansenLabel | null): l is NansenLabel => l !== null && l.label.trim().length > 0);
}

/**
 * Normalizes raw Nansen current-balance payload into typed NansenBalance array.
 */
export function mapNansenBalances(raw: unknown, chain: string = 'monad'): NansenBalance[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as any).data)
    ? (raw as any).data
    : typeof raw === 'object' && Array.isArray((raw as any).balances)
    ? (raw as any).balances
    : [];

  return list.map((item: any) => {
    const symbol = item.token_symbol || item.symbol || item.token || 'MON';
    const numBalance = parseFloat(String(item.balance ?? item.amount ?? '0')) || 0;
    const balanceRaw = item.balance !== undefined ? item.balance : numBalance;
    const balanceFormatted = parseFloat(item.balance_formatted ?? String(numBalance)) || numBalance;
    const balanceUsd = item.balance_usd ?? item.valueUsd ? parseFloat(String(item.balance_usd ?? item.valueUsd)) : undefined;

    return {
      tokenAddress: item.token_address || item.address,
      tokenSymbol: symbol,
      symbol,
      tokenName: item.token_name || symbol,
      balance: balanceRaw,
      balanceFormatted,
      balanceUsd,
      chain: item.chain || chain,
    };
  });
}

/**
 * Normalizes raw Nansen transactions payload into typed NansenTransaction array.
 */
export function mapNansenTransactions(raw: unknown): NansenTransaction[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as any).data)
    ? (raw as any).data
    : typeof raw === 'object' && Array.isArray((raw as any).transactions)
    ? (raw as any).transactions
    : [];

  return list.map((tx: any) => {
    const rawStatus = String(tx.status || 'success').toUpperCase();
    const status: 'SUCCESS' | 'FAILED' | 'PENDING' =
      rawStatus.includes('FAIL') || rawStatus === '0'
        ? 'FAILED'
        : rawStatus.includes('PEND')
        ? 'PENDING'
        : 'SUCCESS';

    const timestamp = tx.block_timestamp
      ? typeof tx.block_timestamp === 'number'
        ? tx.block_timestamp
        : new Date(tx.block_timestamp).getTime()
      : typeof tx.timestamp === 'string'
      ? new Date(tx.timestamp).getTime()
      : tx.timestamp || Date.now();

    const hash = tx.hash || tx.transaction_hash || tx.tx_hash || '0x';
    const val = tx.value ? parseFloat(String(tx.value)) : undefined;

    return {
      txHash: hash,
      hash,
      timestamp,
      from: tx.from_address || tx.from || '',
      to: tx.to_address || tx.to || '',
      valueMon: val,
      value: val,
      valueUsd: tx.value_usd ? parseFloat(String(tx.value_usd)) : undefined,
      method: tx.method_name || tx.function_name || tx.method,
      status,
    };
  });
}

/**
 * Normalizes raw Nansen counterparties payload into typed NansenCounterparty array.
 */
export function mapNansenCounterparties(raw: unknown): NansenCounterparty[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as any).data)
    ? (raw as any).data
    : typeof raw === 'object' && Array.isArray((raw as any).counterparties)
    ? (raw as any).counterparties
    : [];

  return list.map((cp: any) => {
    return {
      address: cp.counterparty_address || cp.address || '',
      label: cp.label || cp.entity_name || cp.name,
      interactionCount: Number(cp.transactions_count || cp.interaction_count || cp.interactionCount || cp.count || 1),
      volumeMon: cp.volume_mon ? parseFloat(String(cp.volume_mon)) : undefined,
      volumeUsd: cp.volume_usd || cp.volumeUsd ? parseFloat(String(cp.volume_usd || cp.volumeUsd)) : undefined,
      lastInteraction: cp.last_transaction_timestamp
        ? new Date(cp.last_transaction_timestamp).getTime()
        : undefined,
    };
  });
}

/**
 * Normalizes raw Nansen related wallets payload into typed NansenRelatedWallet array.
 */
export function mapNansenRelatedWallets(raw: unknown): NansenRelatedWallet[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as any).data)
    ? (raw as any).data
    : typeof raw === 'object' && Array.isArray((raw as any).related_wallets)
    ? (raw as any).related_wallets
    : typeof raw === 'object' && Array.isArray((raw as any).related)
    ? (raw as any).related
    : [];

  return list.map((rw: any) => ({
    address: rw.address || '',
    relationshipType: rw.relationship_type || rw.relationshipType || rw.type || 'Affiliated Wallet',
    label: rw.label || rw.name,
    clusterId: rw.cluster_id || rw.clusterId,
    confidence: rw.confidence,
    reason: rw.reason,
  }));
}

/**
 * Normalizes aggregated responses into the full ECON EconomicIntelligence model.
 * Supports both params object and (address, chain, rawData) signature.
 */
export function mapToEconomicIntelligence(
  arg1: any,
  arg2?: any,
  arg3?: any
): EconomicIntelligence {
  let address = '';
  let chain = 'monad';
  let rawLabels: unknown;
  let rawBalances: unknown;
  let rawTransactions: unknown;
  let rawCounterparties: unknown;
  let rawRelatedWallets: unknown;
  let available = true;
  let error: string | undefined;
  let status: number | undefined;
  let ttlMs = 5 * 60 * 1000;

  if (typeof arg1 === 'string') {
    address = arg1;
    chain = arg2 || 'monad';
    const rawData = arg3 || {};
    rawLabels = rawData.labels || rawData.data;
    rawBalances = rawData.balances || rawData.data;
    rawTransactions = rawData.transactions || rawData.data;
    rawCounterparties = rawData.counterparties || rawData.data;
    rawRelatedWallets = rawData.related_wallets || rawData.related;
    available = rawData.available !== undefined ? rawData.available : true;
    error = rawData.error;
    status = rawData.status;
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    address = arg1.address || '';
    chain = arg1.chain || 'monad';
    rawLabels = arg1.rawLabels ?? arg1.labels;
    rawBalances = arg1.rawBalances ?? arg1.balances;
    rawTransactions = arg1.rawTransactions ?? arg1.transactions;
    rawCounterparties = arg1.rawCounterparties ?? arg1.counterparties;
    rawRelatedWallets = arg1.rawRelatedWallets ?? arg1.relatedWallets ?? arg1.related;
    available = arg1.available !== undefined ? arg1.available : true;
    error = arg1.error;
    status = arg1.status;
    ttlMs = arg1.ttlMs || ttlMs;
  }

  const now = Date.now();
  const labels = mapNansenLabels(rawLabels);
  const balances = mapNansenBalances(rawBalances, chain);
  const recentTransactions = mapNansenTransactions(rawTransactions);
  const counterparties = mapNansenCounterparties(rawCounterparties);
  const relatedWallets = mapNansenRelatedWallets(rawRelatedWallets);

  return {
    address: (address || '0x0000000000000000000000000000000000000000').toLowerCase(),
    chain,
    labels,
    balances,
    recentTransactions,
    counterparties,
    relatedWallets,
    fetchedAt: new Date(now).toISOString(),
    expiresAt: now + ttlMs,
    source: 'nansen',
    available,
    error,
    status,
  };
}
