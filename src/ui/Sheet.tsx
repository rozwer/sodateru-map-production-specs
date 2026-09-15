import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { messages } from '../messages';
import { Icon } from './Icon';
import './sheet.css';

export interface SheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  side?: 'left' | 'right';
  kind?: 'screen' | 'navigation';
  onRect?: (rect: DOMRect | null) => void;
}
export function Sheet({ open, title, children, onClose, onBack, side = 'left', kind = 'screen', onRect }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useLayoutEffect(() => {
    if (!open || !ref.current) { onRect?.(null); return; }
    const panel = ref.current;
    const update = () => onRect?.(panel.getBoundingClientRect());
    const observer = new ResizeObserver(update); observer.observe(panel); update();
    window.addEventListener('resize', update);
    const source = document.activeElement as HTMLElement | null;
    panel.focus({ preventScroll: true });
    return () => {
      observer.disconnect(); window.removeEventListener('resize', update); onRect?.(null);
      if (source?.isConnected) source.focus({ preventScroll: true });
    };
  }, [open, side, kind, onRect]);
  return <aside ref={ref} hidden={!open} tabIndex={-1} className={`sm-sheet sm-sheet--${side} sm-sheet--${kind}`} role="dialog" aria-label={title} onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
  }}>
    <header className="sm-sheet__header">
      {onBack && <button className="sm-icon-button" type="button" onClick={onBack} aria-label={messages.back}><Icon name="back"/></button>}
      {kind === 'screen' && <h1>{title}</h1>}
      <button className="sm-icon-button sm-sheet__close" type="button" onClick={onClose} aria-label={messages.close}><Icon name="close" size={22}/></button>
    </header>
    <div className="sm-sheet__body" data-sheet-scroll>{children}</div>
  </aside>;
}
