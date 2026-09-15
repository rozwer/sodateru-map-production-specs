// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { PlaceImage } from './components';
import { RouteResultsPage } from './RouteResultsPage';
import { createRouteDraft, type RouteCandidateView } from './types';

const containers: HTMLElement[] = [];
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { containers.forEach(container => container.remove()); containers.length = 0; });

describe('retained route screen components', () => {
  it('keeps native radio selection independent in hidden and visible screens', async () => {
    const candidates: RouteCandidateView[] = ['a', 'b'].map(id => ({ id, name: id, distanceM: 10, travelDurationSec: 10, stayDurationSec: 0, totalDurationSec: 10, evaluations: [], adoptable: true }));
    function Results() {
      const [selectedId, onSelect] = useState<string | null>('a');
      return <RouteResultsPage draft={createRouteDraft()} candidates={candidates} selectedId={selectedId} onSelect={onSelect} onBack={() => {}} onChangeConditions={() => {}} onAdopt={() => {}} map={{ summary: 'test' }}/>;
    }
    const container = document.createElement('div'); document.body.append(container); containers.push(container);
    const root = createRoot(container);
    await act(async () => root.render(<><div hidden><Results/></div><Results/></>));
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type=radio]')];
    expect(radios).toHaveLength(4);
    await act(async () => radios[3]!.click());
    expect(radios[0]!.checked).toBe(true);
    expect(radios[3]!.checked).toBe(true);
    expect(radios[0]!.name).not.toBe(radios[3]!.name);
    await act(async () => root.unmount());
  });
  it('retains a photo-sized retry control after an image fails', async () => {
    const container = document.createElement('div'); document.body.append(container); containers.push(container);
    const root = createRoot(container);
    await act(async () => root.render(<PlaceImage src="/missing-photo.jpg" alt="目的地の写真"/>));
    await act(async () => container.querySelector('img')!.dispatchEvent(new Event('error')));
    const retry = container.querySelector<HTMLButtonElement>('button.routes-place-image');
    expect(retry?.getAttribute('aria-label')).toContain('写真を表示できません');
    await act(async () => retry!.click());
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/missing-photo.jpg');
    await act(async () => root.unmount());
  });
});
