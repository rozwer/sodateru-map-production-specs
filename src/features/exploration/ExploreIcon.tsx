import type { SVGProps } from 'react';

export type ExploreIconName = 'back' | 'next' | 'mic' | 'pause' | 'send' | 'search' | 'plus' | 'close' | 'pin' | 'map' | 'heart' | 'walk' | 'compass' | 'clock' | 'image' | 'book' | 'source' | 'entrance' | 'info' | 'shield' | 'lock' | 'edit' | 'sprout';

const paths: Record<ExploreIconName, string> = {
  back: 'm15 5-7 7 7 7', next: 'm9 5 7 7-7 7',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1M12 18v4M9 22h6',
  pause: 'M8 5v14M16 5v14', send: 'm3 10 18-7-7 18-3-8-8-3Zm8 3L21 3',
  search: 'M16 16 21 21M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  plus: 'M12 3v18M3 12h18', close: 'm6 6 12 12M18 6 6 18',
  pin: 'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 1 1 14 0ZM14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  map: 'm2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Zm6-3v17M16 5v17',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z',
  walk: 'M14 3a1 1 0 1 1 0 .01M7 22l3-8 4 3 2 5M10 14l2-8 3 5 5 2M12 6 7 9l-2 4',
  compass: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-6-4-3 5-5 3 3-5 5-3Z',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v7l4 2',
  image: 'M3 3h18v18H3V3Zm0 13 6-6 7 8 3-4 2 2M16 7h.01',
  book: 'M12 5C9 3 5 3 2 4v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v16',
  source: 'M5 2h9l5 5v15H5V2Zm9 0v6h5',
  entrance: 'M6 22V2h12v20M12 13h.01M3 22h18',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6M12 7h.01',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm0 0v20',
  lock: 'M5 10h14v12H5V10Zm3 0V6a4 4 0 1 1 8 0v4M12 15v3',
  edit: 'm3 21 5-1L21 7l-4-4L4 16l-1 5Zm11-15 4 4',
  sprout: 'M12 22V10M12 14C3 14 2 10 2 4c7 0 10 2 10 8M12 12c0-6 4-8 10-8 0 6-2 10-10 10M7 22h10',
};

export function ExploreIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: ExploreIconName }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
