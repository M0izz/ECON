import { ECONEvent, ECONEventType } from './types';

export type EventListener = (event: ECONEvent) => void;

export class EventBus {
  private listeners: Map<ECONEventType | '*', Set<EventListener>> = new Map();
  private eventHistory: ECONEvent[] = [];
  private maxHistory: number = 250;

  constructor() {
    this.listeners.set('*', new Set());
  }

  public subscribe(eventType: ECONEventType | '*', listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public emit(event: Omit<ECONEvent, 'id' | 'timestamp'>): ECONEvent {
    const fullEvent: ECONEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    this.eventHistory.unshift(fullEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    // Notify specific type subscribers
    const specificListeners = this.listeners.get(event.type);
    if (specificListeners) {
      specificListeners.forEach((fn) => {
        try {
          fn(fullEvent);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${event.type}:`, err);
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((fn) => {
        try {
          fn(fullEvent);
        } catch (err) {
          console.error(`[EventBus] Error in wildcard listener:`, err);
        }
      });
    }

    return fullEvent;
  }

  public getHistory(): ECONEvent[] {
    return [...this.eventHistory];
  }

  public clear(): void {
    this.eventHistory = [];
  }
}

export const globalEventBus = new EventBus();
