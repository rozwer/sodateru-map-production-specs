import React, { type SVGProps } from 'react';

export type KnowledgeIconName = 'back' | 'close' | 'search' | 'filter' | 'cup' | 'meal' | 'walk' | 'people' | 'person' | 'pin' | 'bookmark' | 'map' | 'globe' | 'lock' | 'chevron' | 'source' | 'more' | 'locate' | 'play';
const paths: Record<KnowledgeIconName, string> = {
  back: 'M19 12H5m7-7-7 7 7 7', close: 'm6 6 12 12M6 18 18 6',
  search: 'M21 21l-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
  filter: 'M3 5h18M6 10h12M10 15h4M14 10v10l-4-2v-3',
  cup: 'M4 3h12v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM16 5h2a3 3 0 1 1 0 6h-2M3 21h16',
  meal: 'M5 2v7m-3-7v5a3 3 0 0 0 6 0V2M5 10v12M17 2v20m0-20c-4 3-4 8 0 9',
  walk: 'M14 4a1.5 1.5 0 1 0 0-.01M10 22l2-7-3-3 3-5 4 4 4 1M4 13l4-3M12 15l5 7',
  people: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 5 5v2',
  person: 'M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 22v-3a8 8 0 0 1 16 0v3',
  pin: 'M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14ZM12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  bookmark: 'M6 3h12v19l-6-4-6 4Z', map: 'm2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3ZM8 2v17M16 5v17',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20',
  lock: 'M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4M12 15v3',
  chevron: 'm9 5 7 7-7 7', source: 'M5 2h9l5 5v15H5ZM14 2v6h5M9 12h6M9 16h6',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  locate: 'M12 2v3m0 14v3M2 12h3m14 0h3M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  play: 'm8 4 12 8-12 8Z',
};
export function KnowledgeIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: KnowledgeIconName }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
