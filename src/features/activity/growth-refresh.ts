/** Successful saves invalidate derived growth in the same person/mode only. */
const listeners = new Set<(scopeKey: string) => void>();

export function subscribeGrowthChanges(listener: (scopeKey: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyGrowthChanged(scopeKey: string): void {
  for (const listener of listeners) listener(scopeKey);
}
