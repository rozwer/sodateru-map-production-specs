import { api } from './api';
import { deviceTimeZone, recordCard, today } from '../features/reflection/records';
import coffee from '../features/feature-requests/assets/coffee.jpg';
import park from '../features/feature-requests/assets/park.jpg';

export interface NavigationPhoto { title: string; detail: string; photoUrl?: string }
// Display-only examples, gated by the existing shell's demo mode. Never saved as records.
export const navigationExamples: NavigationPhoto[] = [
  { title: 'カフェでひと息', detail: '10:24　本山', photoUrl: coffee },
  { title: '東山公園を散歩', detail: '14:10　東山公園', photoUrl: park },
];
export async function readNavigationPhotos(mode: 'self' | 'community', signal: AbortSignal): Promise<NavigationPhoto[]> {
  if (mode === 'community') {
    const records = await api.request('getSharedRecords', { query: { limit: 2, includeUndated: true }, signal });
    return records.items.map(record => ({
      title: record.body.split('\n')[0] || record.place?.name || '共有された体験',
      detail: [record.person.displayName, record.place?.name].filter(Boolean).join('　'),
      photoUrl: record.media.find(media => media.kind === 'photo' && media.contentUrl)?.contentUrl ?? undefined,
    }));
  }
  const timeZone = deviceTimeZone();
  const day = (await api.request('getReflectionDaysDate', { path: { date: today(timeZone) }, query: { timeZone }, signal })).data;
  const records = await api.request('getRecords', { query: { from: day.from, to: day.to, timeZone, kind: 'experience', limit: 2 }, signal });
  return Promise.all(records.items.map(async record => {
    const card = await recordCard(record, timeZone, signal);
    return { title: card.title, detail: `${card.when}　${card.place}`, photoUrl: card.photoUrl };
  }));
}
