// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { DailyTrack, type TimelineEntry } from './DailyTrack';

it('reveals a map-selected card again without scrolling for manual expansion or date changes', async () => {
 (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
 const scroll = vi.fn();
 const originalScrollBy = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollBy');
 Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scroll });
 vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
 vi.stubGlobal('cancelAnimationFrame', vi.fn());
 vi.stubGlobal('matchMedia', () => ({ matches: false }));
 const rectangle = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 390, width: 390, height: bottom - top }) as DOMRect;
 let cardTop = 950;
 const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
  if (this.classList.contains('sm-sheet__body')) return rectangle(0, 844);
  if (this.classList.contains('sm-bottom-nav')) return rectangle(755, 835);
  if (this instanceof HTMLLIElement) return rectangle(this.dataset.entryId === '2' ? cardTop : 150, this.dataset.entryId === '2' ? cardTop + 220 : 270);
  return rectangle(cardTop, cardTop + 45);
 });
 const shell = document.createElement('div');
 shell.innerHTML = '<div class="sm-sheet__body"></div><div class="sm-bottom-nav"></div>';
 document.body.append(shell);
 const body = shell.querySelector('.sm-sheet__body')!;
 const root = createRoot(body);
 const entries: TimelineEntry[] = ['最初', '最後'].map((name, index) => ({
  id: String(index + 1), name, time: index ? '10:00' : '08:00', duration: '',
  media: [], status: 'confirmed', connectedToNext: false, mapNumber: index + 1,
 }));
 const base = {
  date: '2026-09-15', onDate: vi.fn(), entries, expandedId: null as string | null,
  onExpand: vi.fn(), onEdit: vi.fn(), onReflect: vi.fn(), onVisit: vi.fn(),
  onBack: vi.fn(), onMenu: vi.fn(), onRecord: vi.fn(), map: <div>地図</div>,
  onRetry: vi.fn(), confirmedPlaces: 2, duration: '', missingTrack: false,
  onCalendar: vi.fn(), recordedDates: new Set<string>(),
 };
 try {
  await act(async () => root.render(<DailyTrack {...base} />));
  expect(scroll).not.toHaveBeenCalled();
  const selected = { id: '2', revision: 1 };
  await act(async () => root.render(<DailyTrack {...base} expandedId="2" revealEntry={selected} />));
  expect(scroll).toHaveBeenCalledTimes(1);
  expect(scroll).toHaveBeenLastCalledWith({ top: 427, behavior: 'smooth' });
  expect(document.activeElement).toBe(body.querySelectorAll('.activity-entry-toggle')[1]);
  await act(async () => root.render(<DailyTrack {...base} expandedId={null} revealEntry={selected} />));
  await act(async () => root.render(<DailyTrack {...base} date="2026-09-16" expandedId="2" revealEntry={selected} />));
  expect(scroll).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<DailyTrack {...base} expandedId="2" revealEntry={{ id: '2', revision: 2 }} />));
  expect(scroll).toHaveBeenCalledTimes(2);
  cardTop = 180;
  await act(async () => root.render(<DailyTrack {...base} expandedId="2" revealEntry={{ id: '2', revision: 3 }} />));
  expect(scroll).toHaveBeenCalledTimes(2);
  cardTop = 950;
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  await act(async () => root.render(<DailyTrack {...base} expandedId="2" revealEntry={{ id: '2', revision: 4 }} />));
  expect(scroll).toHaveBeenLastCalledWith({ top: 427, behavior: 'auto' });
 } finally {
  await act(async () => root.unmount());
  shell.remove();
  bounds.mockRestore();
  if (originalScrollBy) Object.defineProperty(HTMLElement.prototype, 'scrollBy', originalScrollBy);
  else delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
  vi.unstubAllGlobals();
 }
});
