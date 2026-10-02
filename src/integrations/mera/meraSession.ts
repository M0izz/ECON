import type { LocalAccount } from 'viem';
import {
  ECONKeyRole,
  ECONPasskeyAccount,
  ECONPasskeyIdentity,
  ECONPasskeyPublicMetadata,
} from './meraTypes';

export type SessionStateListener = (identity: ECONPasskeyIdentity | null) => void;

/**
 * Manages the lifecycle of active Mera passkey signing sessions.
 * Holds signing sessions in-memory ONLY.
 * Never persists private keys or PRF outputs to disk or browser storage.
 */
export class MeraSessionManager {
  private activeIdentity: ECONPasskeyIdentity | null = null;
  private listeners: Set<SessionStateListener> = new Set();

  public subscribe(listener: SessionStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.activeIdentity));
  }

  public setActiveIdentity(identity: ECONPasskeyIdentity): void {
    // End any existing session prior to setting new one
    if (this.activeIdentity && this.activeIdentity !== identity) {
      this.disconnect();
    }
    this.activeIdentity = identity;
    this.notify();
  }

  public getActiveIdentity(): ECONPasskeyIdentity | null {
    return this.activeIdentity;
  }

  public isConnected(): boolean {
    return this.activeIdentity !== null;
  }

  public getAccount(role: ECONKeyRole): ECONPasskeyAccount | null {
    if (!this.activeIdentity) return null;
    return this.activeIdentity.accounts[role] || null;
  }

  public getViemAccount(role: ECONKeyRole): LocalAccount<'mera'> | null {
    const acc = this.getAccount(role);
    return acc ? acc.viemAccount : null;
  }

  /**
   * Safe public metadata that can be displayed or stored.
   * Contains only public addresses, credential ID, and creation timestamp.
   */
  public getPublicMetadata(): ECONPasskeyPublicMetadata | null {
    if (!this.activeIdentity) return null;
    const { credentialId, transports, accounts, createdAt } = this.activeIdentity;
    return {
      credentialId,
      transports,
      addresses: {
        operating: accounts.operating.address,
        treasury: accounts.treasury.address,
        escrow: accounts.escrow.address,
        recovery: accounts.recovery.address,
      },
      createdAt,
    };
  }

  /**
   * Terminates all Mera signing sessions, zeroing out sensitive private key material
   * in memory, and clears the active identity state.
   */
  public disconnect(): void {
    if (this.activeIdentity) {
      for (const account of Object.values(this.activeIdentity.accounts)) {
        try {
          account.session.end();
        } catch {
          // Ignore if already ended
        }
      }
      this.activeIdentity = null;
      this.notify();
    }
  }
}

export const globalMeraSession = new MeraSessionManager();
