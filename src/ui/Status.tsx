import type { ReactNode } from 'react';
import { messages } from '../messages';
import { Button } from './Button';
export function Status({ kind = 'empty', children, onRetry }: { kind?: 'loading' | 'empty' | 'error' | 'unavailable'; children: ReactNode; onRetry?: () => void }) {
  return <div className={`sm-status sm-status--${kind}`} role={kind === 'error' ? 'alert' : 'status'}><p>{children}</p>{onRetry && <Button onClick={onRetry}>{messages.retry}</Button>}</div>;
}
