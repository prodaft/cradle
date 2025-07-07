import { TabEvent } from '../../../types/tab.types';

export class TabEventBus {
  private static instance: TabEventBus;
  private listeners: Map<string, Array<(event: TabEvent) => void>> = new Map();
  private tabSubscriptions: Map<string, Set<string>> = new Map(); // tabId -> eventTypes

  static getInstance(): TabEventBus {
    if (!TabEventBus.instance) {
      TabEventBus.instance = new TabEventBus();
    }
    return TabEventBus.instance;
  }

  // Subscribe to events
  subscribe(tabId: string, eventType: string, callback: (event: TabEvent) => void): () => void {
    const key = `${tabId}:${eventType}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(callback);

    // Track subscriptions for cleanup
    if (!this.tabSubscriptions.has(tabId)) {
      this.tabSubscriptions.set(tabId, new Set());
    }
    this.tabSubscriptions.get(tabId)!.add(eventType);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit event to specific tab or broadcast
  emit(event: TabEvent): boolean {
    if (event.targetTabId) {
      // Send to specific tab
      const key = `${event.targetTabId}:${event.type}`;
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback(event));
        return true; // Event handled
      }
      return false;
    } else {
      // Broadcast to all tabs listening to this event type
      let f = false;
      this.listeners.forEach((callbacks, key) => {
        const [tabId, eventType] = key.split(/:(.+)/).filter(Boolean);
        if (eventType === event.type && tabId !== event.sourceTabId) {
          callbacks.forEach(callback => callback(event));
          f = true; // At least one listener handled the event
        }
      });
      return f; // Return true if any listener handled the event
    }
  }

  // Clean up all subscriptions for a tab
  unsubscribeAll(tabId: string): void {
    const eventTypes = this.tabSubscriptions.get(tabId);
    if (eventTypes) {
      eventTypes.forEach(eventType => {
        const key = `${tabId}:${eventType}`;
        this.listeners.delete(key);
      });
      this.tabSubscriptions.delete(tabId);
    }
  }

  // Get all tabs listening to a specific event type
  getListeners(eventType: string): string[] {
    const listeners: string[] = [];
    this.listeners.forEach((_, key) => {
      const [tabId, type] = key.split(':');
      if (type === eventType) {
        listeners.push(tabId);
      }
    });
    return listeners;
  }
}
