import type { ReactNode } from 'react';
import { messages as copy } from '../messages';
import { Button } from './Button';
import { Icon } from './Icon';
import './chat.css';

export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; status?: 'pending' | 'complete' | 'error' }
export interface ChatProps {
  messages: ChatMessage[];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  error?: string | null;
  toolbar?: ReactNode;
  children?: ReactNode;
}
export function Chat({ messages, value, onChange, onSend, busy, onCancel, onRetry, error, toolbar, children }: ChatProps) {
  return <section className="sm-chat" aria-label={copy.chatLabel}>
    <div className="sm-chat__messages" role="log" aria-live="polite" aria-relevant="additions text">
      {messages.map(message => <article key={message.id} className={`sm-chat__message sm-chat__message--${message.role}`}>
        <p>{message.content}</p>
        {message.status === 'pending' && <small>{copy.processing}</small>}
      </article>)}
    </div>
    {children}
    {busy && <div className="sm-chat__status" role="status">{copy.processing}{onCancel && <Button onClick={onCancel}>{copy.stop}</Button>}</div>}
    {error && <div className="sm-status sm-status--error" role="alert"><p>{error}</p>{onRetry && <Button onClick={onRetry} disabled={busy}>{copy.retry}</Button>}</div>}
    <form className="sm-chat__composer" onSubmit={event => { event.preventDefault(); if (!busy && value.trim()) onSend(); }}>
      {toolbar && <div className="sm-chat__toolbar">{toolbar}</div>}
      <textarea aria-label={copy.chatLabel} placeholder={copy.chatPlaceholder} value={value} rows={2} onChange={event => onChange(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (!busy && value.trim()) onSend(); }
      }}/>
      <Button type="submit" variant="primary" disabled={busy || !value.trim()} aria-label={copy.send}><Icon name="send"/></Button>
    </form>
  </section>;
}
