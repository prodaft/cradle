import { useEffect, useRef } from 'react';
import { TabEventBus } from '../components/tabs/core/TabEventBus';
import { TabEvent } from '../types/tab.types';

export const useTabCommunication = (tabId: string) => {
  const eventBus = useRef(TabEventBus.getInstance());
  const unsubscribeFunctions = useRef<Array<() => void>>([]);

  const subscribeToEvent = (eventType: string, callback: (event: TabEvent) => void) => {
    const unsubscribe = eventBus.current.subscribe(tabId, eventType, callback);
    unsubscribeFunctions.current.push(unsubscribe);
    return unsubscribe;
  };

  const emitEvent = (eventType: string, payload: any, targetTabId?: string) => {
    eventBus.current.emit({
      type: eventType,
      sourceTabId: tabId,
      targetTabId,
      payload
    });
  };

  useEffect(() => {
    return () => {
      unsubscribeFunctions.current.forEach(unsub => unsub());
      eventBus.current.unsubscribeAll(tabId);
    };
  }, [tabId]);

  return { subscribeToEvent, emitEvent };
};