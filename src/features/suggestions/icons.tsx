import type { ReactNode } from 'react';
const paths: Record<string, ReactNode> = {
 heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
 chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.8L3 21l1.8-5.5a9 9 0 0 1-.8-4 8.5 8.5 0 1 1 17 0Z"/><path d="M8 11h.1M12 11h.1M16 11h.1"/></>,
 clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
 walk: <><circle cx="14" cy="3" r="1.5"/><path d="m8 22 3-7 3 3v4M5 12l4-5 5 1 3 5h3M14 8l-3 7-3-3"/></>,
 people: <><circle cx="9" cy="6" r="3"/><path d="M2 21v-4a7 7 0 0 1 14 0v4M17 3a3 3 0 0 1 0 6M18 12a5 5 0 0 1 4 5v4"/></>,
 shoe: <><path d="m4 12 5-9 4 2-1 5 3 3 6 2v5H3v-5ZM3 17h18M9 8l4 2M7 11l5 2"/></>,
 search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/></>,
 arrow: <path d="m9 5 7 7-7 7"/>,
 book: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/></>,
 memo: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/></>,
 bookmark: <path d="M6 21V3h12v18l-6-4Z"/>,
 star: <path d="m12 2 3 6.5 7 .9-5 5 1.2 7.1L12 18l-6.2 3.5L7 14.4l-5-5 7-.9Z"/>,
 cup: <><path d="M4 4h13v9a6.5 6.5 0 0 1-13 0ZM17 6h2a3 3 0 0 1 0 6h-2M3 22h16"/></>,
 check: <path d="m5 12 4 4L19 6"/>,
 link: <><path d="m10 7 3-3a5 5 0 0 1 7 7l-3 3M14 17l-3 3a5 5 0 0 1-7-7l3-3M8 16l8-8"/></>,
 bulb: <><path d="M8 17v-2a6 6 0 1 1 8 0v2ZM9 21h6M12 1v-1M2 8H0M24 8h-2"/></>,
 share: <><path d="M8 7H4v15h16V7h-4M12 15V1m-4 4 4-4 4 4"/></>,
 sliders: <><path d="M3 5h18M3 12h18M3 19h18"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="19" r="2"/></>,
};
export function SuggestionIcon({name}: {name: keyof typeof paths}) {return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;}
