import { useSyncExternalStore } from 'react';
import type { DisasterSettings } from '../types';

type DemoState = { installed: boolean; enabled: boolean; settings: DisasterSettings | null; icon: string };
type Store = { value: DemoState; listeners: Set<() => void> };
const stores = new Map<string, Store>();
const initial: DemoState = { installed: false, enabled: false, settings: null, icon: 'shield' };

function storeFor(scopeKey: string): Store {
  let store = stores.get(scopeKey);
  if (!store) {
    store = { value: initial, listeners: new Set() };
    stores.set(scopeKey, store);
  }
  return store;
}

/** UI-only demo state, scoped to the selected person and discarded on reload. */
export function useDisasterDemoState(scopeKey: string) {
  const store = storeFor(scopeKey);
  const value = useSyncExternalStore(
    listener => { store.listeners.add(listener); return () => { store.listeners.delete(listener); }; },
    () => store.value,
  );
  const update = (patch: Partial<DemoState>) => {
    store.value = { ...store.value, ...patch };
    for (const listener of store.listeners) listener();
  };
  return { value, update };
}
