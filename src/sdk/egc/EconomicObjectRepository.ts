import { EconomicStore } from '../store';
import { EconomicObject, ObjectId, AgentId } from '../types';
import { EntitlementStatus } from './types';

export class EconomicObjectRepository {
  private store: EconomicStore;
  private objectVersions: Map<ObjectId, number> = new Map();

  constructor(store: EconomicStore) {
    this.store = store;
  }

  public getObject(id: ObjectId): EconomicObject | undefined {
    return this.store.getObject(id);
  }

  public getAllObjects(): EconomicObject[] {
    return this.store.getAllObjects();
  }

  public getObjectsByOwner(owner: AgentId): EconomicObject[] {
    return this.store.getObjectsByOwner(owner);
  }

  public getVersion(id: ObjectId): number {
    return this.objectVersions.get(id) || 1;
  }

  public saveObject(object: EconomicObject): void {
    const currentVersion = this.getVersion(object.id);
    this.objectVersions.set(object.id, currentVersion + 1);
    this.store.setObject({
      ...object,
    });
  }

  public updateObjectStatus(
    id: ObjectId,
    status: EconomicObject['status'],
    partialUpdates?: Partial<EconomicObject>,
    expectedVersion?: number
  ): boolean {
    const currentVersion = this.getVersion(id);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(
        `Concurrency conflict on object ${id}: expected version ${expectedVersion}, got ${currentVersion}`
      );
    }

    const updated = this.store.updateObjectStatus(id, status, partialUpdates);
    if (updated) {
      this.objectVersions.set(id, currentVersion + 1);
    }
    return updated;
  }

  /**
   * Helper to normalize an object's transferability flag to EntitlementStatus.
   * If not explicitly defined, strictly maps `transferable: true` -> 'YES', `false` -> 'NO'.
   */
  public getTransferability(obj: EconomicObject): EntitlementStatus {
    const raw = (obj as any).transferability;
    if (raw === 'YES' || raw === 'NO' || raw === 'UNKNOWN') return raw;
    return obj.transferable ? 'YES' : 'NO';
  }

  public getRefundability(obj: EconomicObject): EntitlementStatus {
    const raw = (obj as any).refundability;
    if (raw === 'YES' || raw === 'NO' || raw === 'UNKNOWN') return raw;
    return 'UNKNOWN';
  }

  public getSellability(obj: EconomicObject): EntitlementStatus {
    const raw = (obj as any).sellability;
    if (raw === 'YES' || raw === 'NO' || raw === 'UNKNOWN') return raw;
    return this.getTransferability(obj) === 'YES' ? 'YES' : 'NO';
  }

  public getActiveObligations(obj: EconomicObject): number {
    return (obj as any).activeObligations ?? 0;
  }
}
