import type { SVGProps } from 'react';

export type RouteIconName = 'back' | 'next' | 'close' | 'plus' | 'clock' | 'pin' | 'origin' | 'walking' | 'cycling' | 'transit' | 'driving' | 'stairs' | 'covered' | 'locate' | 'map' | 'list' | 'stop' | 'up' | 'down' | 'left' | 'right' | 'straight' | 'uturn' | 'arrive' | 'warning';
const paths: Record<RouteIconName, React.ReactNode> = {
  back: <path d="m15 5-7 7 7 7"/>, next: <path d="m9 5 7 7-7 7"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>, plus: <path d="M12 4v16M4 12h16"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  origin: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></>,
  walking: <><circle cx="14" cy="3.5" r="1.5"/><path d="m10 21 2-7-3-3 3-5 3 5 4 1M5 11l4-3M15 21l-1-5-3-3"/></>,
  cycling: <><circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 5-10 5 10H5l8-7h4l2 7M8 6h4M16 4h3"/></>,
  transit: <><rect x="5" y="2" width="14" height="17" rx="3"/><path d="M5 12h14M12 4v8M7 22l2-3m8 3-2-3M8 16h1m6 0h1"/></>,
  driving: <><path d="m4 10 2-6h12l2 6v9h-3v-3H7v3H4v-9Zm0 0h16M7 13h1m8 0h1"/></>,
  stairs: <path d="M3 21v-6h6V9h6V3h6M18 3h3v3"/>,
  covered: <><path d="M3 12a9 9 0 0 1 18 0c-2-2-4-2-6 0-2-2-4-2-6 0-2-2-4-2-6 0ZM12 3V1m0 11v7c0 4 5 4 5 0"/></>,
  locate: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>,
  map: <><path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5ZM9 2v17m6-14v17"/></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></>,
  stop: <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" stroke="none"/>,
  up: <path d="m6 15 6-6 6 6"/>, down: <path d="m6 9 6 6 6-6"/>,
  left: <path d="M18 21V10a4 4 0 0 0-4-4H4m6-5L4 6l6 5"/>,
  right: <path d="M6 21V10a4 4 0 0 1 4-4h10m-6-5 6 5-6 5"/>,
  straight: <path d="M12 22V2m-7 7 7-7 7 7"/>,
  uturn: <path d="M19 21V8A7 7 0 0 0 5 8v7m-4-5 4 5 4-5"/>,
  arrive: <><path d="M5 22V2h14l-3 4 3 4H5"/><path d="M8 3h4v3H8zm4 3h4v3h-4z" fill="currentColor" stroke="none"/></>,
  warning: <><circle cx="12" cy="12" r="10"/><path d="M12 6v7m0 4v.1"/></>,
};
export function RouteIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: RouteIconName }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
