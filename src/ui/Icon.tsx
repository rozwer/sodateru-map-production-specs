import type { SVGProps } from 'react';

export type IconName = 'map' | 'camera' | 'person' | 'people' | 'leaf' | 'settings' | 'exit' | 'close' | 'chevron' | 'back' | 'clock' | 'chart' | 'pin' | 'locate' | 'menu' | 'send' | 'mic' | 'history';
const paths: Record<IconName, React.ReactNode> = {
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></>,
  camera: <><path d="M3 6h4l2-3h6l2 3h4v15H3Z"/><circle cx="12" cy="13" r="4"/></>,
  person: <><circle cx="12" cy="6" r="3.5"/><path d="M5 22v-5a7 7 0 0 1 14 0v5"/></>,
  people: <><circle cx="9" cy="6" r="3.5"/><path d="M2 21v-4a7 7 0 0 1 14 0v4M17 3a3.5 3.5 0 0 1 0 7M18 12a6 6 0 0 1 4 6v3"/></>,
  leaf: <><path d="M4 17C0 5 12 1 21 2c1 10-3 20-14 17M3 23 16 7"/></>,
  settings: <><path d="m9 2-.7 3-2.3 1-2.6-.8-1.8 3 2 2.2-.2 2.6-2 2 1.8 3 2.8-.5 2 1.4.7 3.1h3.7l1-3 2.4-1 2.7.8 1.9-3-2-2.3.1-2.5 2-2-1.8-3-2.8.5-2-1.5-.7-3Z"/><circle cx="11.5" cy="12" r="3"/></>,
  exit: <><path d="M8 5V2h12v20H8v-3M2 12h12m-4-4 4 4-4 4"/></>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  back: <path d="m15 5-7 7 7 7"/>,
  clock: <><circle cx="12" cy="12" r="10"/><path d="M12 5v7h6"/></>,
  chart: <><path d="M3 21V12h4v9M10 21V7h4v14M17 21V2h4v19"/></>,
  pin: <><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  locate: <><path d="M12 1v3M12 21v2M19 11c0 5-7 10-7 10S5 16 5 11a7 7 0 0 1 14 0Z"/><circle cx="12" cy="11" r="3"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  send: <><path d="m3 3 19 9-19 9 4-9ZM7 12h15"/></>,
  mic: <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>,
  history: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 6v6l4 3"/></>,
};
export function Icon({ name, size = 24, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg className="sm-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
