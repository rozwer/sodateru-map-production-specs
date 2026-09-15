import type { RouteState } from './contracts';

export interface RouteEntry { key: string; route: RouteState; focus: HTMLElement | null; focusId?: string; focusText?: string; scrollTop: number }
export const routeKey = (route: RouteState) => `${route.pageId}?${new URLSearchParams(Object.entries(route.params).sort()).toString()}`;
export function parseRoute(hash: string): RouteState {
  const url = new URL(hash.replace(/^#\/?/, '') || 'map', 'https://local.invalid/');
  return { pageId: decodeURIComponent(url.pathname.slice(1)) || 'map', params: Object.fromEntries(url.searchParams) };
}
export const routeHash = (route: RouteState) => `#/${encodeURIComponent(route.pageId)}${Object.keys(route.params).length ? `?${new URLSearchParams(route.params)}` : ''}`;

/** Browser back and in-app back use the same stack. Entries retain the actual source focus node. */
export class NavigationStore {
  private listeners = new Set<() => void>();
  private stack: RouteEntry[];
  constructor(initial: RouteState = { pageId: 'map', params: {} }) {
    this.stack = [{ key: routeKey(initial), route: initial, focus: null, scrollTop: 0 }];
  }
  getSnapshot = () => this.stack;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish() { this.listeners.forEach(listener => listener()); }
  navigate = (pageId: string, params: Record<string, string> = {}) => {
    const current = this.stack.at(-1)!;
    current.focus = typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null;
    current.focusId = current.focus?.id || undefined;
    current.focusText = current.focus?.tagName === 'BUTTON' ? current.focus.textContent || undefined : undefined;
    const route = { pageId, params };
    if (routeKey(route) === current.key) return;
    this.stack = [...this.stack, { key: routeKey(route), route, focus: null, scrollTop: 0 }];
    this.publish();
  };
  back = () => {
    this.stack = this.stack.length > 1 ? this.stack.slice(0, -1) : [{ key: 'map?', route: { pageId: 'map', params: {} }, focus: null, scrollTop: 0 }];
    this.publish();
  };
  reset = (route: RouteState = { pageId: 'map', params: {} }) => {
    this.stack = [{ key: routeKey(route), route, focus: null, scrollTop: 0 }];
    this.publish();
  };
}
