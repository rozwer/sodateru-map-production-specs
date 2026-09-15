import { useEffect, useState } from 'react';
const subscribers = new Set<{ scope: string; callback: () => void }>();
/** Refresh already-mounted diagnosis/evidence screens after a successful review. */
export function notifyInsightSaved(scope: string) {
  for (const subscriber of subscribers) if (subscriber.scope === scope) subscriber.callback();
}
export function useInsightRevision(scope: string) {
  const [revision, update] = useState(0);
  useEffect(() => { const subscriber = { scope, callback: () => update(value => value + 1) }; subscribers.add(subscriber); return () => { subscribers.delete(subscriber); }; }, [scope]);
  return revision;
}
