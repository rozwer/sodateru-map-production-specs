import type { SVGProps } from 'react';
type Name = 'search' | 'cup' | 'book' | 'layers' | 'compass' | 'locate' | 'bookmark' | 'share' | 'more' | 'robot' | 'cube' | 'trash' | 'pen' | 'walk' | 'plus' | 'minus' | 'motorcycle';
const paths: Record<Name, React.ReactNode> = {
  search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/></>,
  cup: <><path d="M5 6h12v8a6 6 0 0 1-12 0V6Zm12 1h2a3 3 0 0 1 0 6h-2M3 22h18M9 2v1M13 1v2"/></>,
  book: <><path d="M12 5C8 2 5 2 2 3v16c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-6-1-10 2ZM12 5v16"/></>,
  layers: <><path d="m2 7 10-5 10 5-10 5ZM2 12l10 5 10-5M2 17l10 5 10-5"/></>,
  compass: <><path d="m12 3 8 18-8-5-8 5 8-18Z" fill="currentColor" stroke="none"/></>,
  locate: <path d="m2 10 20-8-8 20-3-11Z" fill="currentColor" stroke="none"/>,
  bookmark: <path d="M6 3h12v19l-6-4-6 4Z"/>,
  share: <><path d="M8 9H4v13h16V9h-4M12 16V2m-4 4 4-4 4 4"/></>,
  more: <><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="20" cy="12" r="1.5" fill="currentColor"/></>,
  robot: <><rect x="3" y="5" width="18" height="14" rx="5"/><path d="M12 5V2h4M7 22v-3M17 22v-3M1 10v5M23 10v5"/><circle cx="8" cy="11" r="1.5"/><circle cx="16" cy="11" r="1.5"/><path d="M9 15h6"/></>,
  cube: <><path d="m3 6 9-4 9 4v12l-9 4-9-4ZM3 6l9 5 9-5M12 11v11"/></>,
  trash: <><path d="M3 5h18M9 5V2h6v3M5 5l1 17h12l1-17M10 9v9M14 9v9"/></>,
  pen: <><path d="m4 16 13-13 4 4L8 20l-6 2ZM14 6l4 4M4 16l4 4"/></>,
  walk: <><circle cx="13" cy="3" r="2"/><path d="m9 12 3-5 4 5 4 1M12 7l-5 3-2 4M12 13l-1 5-4 4M12 13l5 4 1 5"/></>,
  plus: <path d="M12 3v18M3 12h18"/>, minus: <path d="M3 12h18"/>,
  motorcycle: <><circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 6-7 8 7-5-13h4M11 10H6M8 17h6l-3-7"/></>,
};
export function MapIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: Name }) { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>; }
