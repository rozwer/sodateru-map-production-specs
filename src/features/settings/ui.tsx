import type { ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/Icon';

export function Glyph({ name }: { name: IconName | 'camera' | 'sparkles' | 'database' | 'shield' | 'stop' | 'thumb' }) {
  const extra: Record<string, ReactNode> = {
    camera: <><path d="M3 6h5l2-3h4l2 3h5v15H3Z"/><circle cx="12" cy="13" r="4"/></>,
    sparkles: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/></>,
    shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m7 12 3 3 6-7"/></>,
    stop: <><circle cx="12" cy="12" r="10"/><path d="M6 12h12"/></>,
    thumb: <path d="M3 3h5v12H3ZM8 14l6 8 2-2-1-6h6V3H8"/>,
  };
  return extra[name] ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{extra[name]}</svg> : <Icon name={name as IconName} size={28}/>;
}
export function Card({ title, icon, children, className = '' }: { title?: string; icon?: Parameters<typeof Glyph>[0]['name']; children: ReactNode; className?: string }) {
  return <section className={`settings-card ${className}`}>{title && <h3>{icon && <Glyph name={icon}/>}<span>{title}</span></h3>}{children}</section>;
}
export function Toggle({ label, description, value, onChange, disabled }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="settings-toggle"><span><strong>{label}</strong>{description && <small>{description}</small>}</span><input type="checkbox" role="switch" checked={value} disabled={disabled} onChange={e => onChange(e.target.checked)}/></label>;
}
export function Entry({ label, description, icon, onClick, testId }: { label: string; description?: string; icon: Parameters<typeof Glyph>[0]['name']; onClick: () => void; testId?: string }) {
  return <button type="button" className="settings-entry" onClick={onClick} data-testid={testId}><span className="settings-entry-icon"><Glyph name={icon}/></span><span><strong>{label}</strong>{description && <small>{description}</small>}</span><Icon name="chevron" size={17}/></button>;
}
export function Note({ children }: { children: ReactNode }) { return <p className="settings-note"><span aria-hidden="true">ⓘ</span><span>{children}</span></p>; }
