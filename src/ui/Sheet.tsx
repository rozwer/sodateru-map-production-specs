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
  header?: 'back' | 'close' | 'back-close' | 'none';
  contentPadding?: 'default' | 'none';
  background?: 'surface' | 'soft';
  onRect?: (rect: DOMRect | null) => void;
}
export function Sheet({ open, title, children, onClose, onBack, side = 'left', kind = 'screen', header = 'back-close', contentPadding = 'default', background = 'surface', onRect }: SheetProps) {
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
  return <aside ref={ref} hidden={!open} tabIndex={-1} className={`sm-sheet sm-sheet--${side} sm-sheet--${kind} sm-sheet--${background}`} role="dialog" aria-label={title} onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
  }}>
    {header !== 'none' && <header className={`sm-sheet__header${header === 'back' && kind !== 'navigation' ? ' sm-sheet__header--centered' : ''}`}>
      {header !== 'close' && onBack && <button className="sm-icon-button" type="button" onClick={onBack} aria-label={messages.back}><Icon name="back"/></button>}
      {kind === 'screen' && <h1>{title}</h1>}
      {(header !== 'back' || kind === 'navigation') && <button className="sm-icon-button sm-sheet__close" type="button" onClick={onClose} aria-label={messages.close}><Icon name="close" size={22}/></button>}
    </header>}
    <div className={`sm-sheet__body${contentPadding === 'none' ? ' sm-sheet__body--no-padding' : ''}`} data-sheet-scroll>{children}</div>
  </aside>;
}
