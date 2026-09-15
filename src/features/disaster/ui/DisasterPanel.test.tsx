// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { DisasterPanel, regions } from './DisasterPanel';
import type { DisasterLayer } from '../types';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('keeps a failed layer inspectable and supports region changes and stopping an installed overlay', async () => {
  const onSettings = vi.fn(), onEnabled = vi.fn(), onRefresh = vi.fn();
  const layer: DisasterLayer = {layerId:'rainfall',kind:'observation',label:'降水',status:'providerError',sourceUrl:'https://www.jma.go.jp/bosai/nowc/',attribution:'気象庁',unit:'mm/h',legend:{url:'https://www.jma.go.jp/bosai/nowc/',description:'降水強度の凡例'},meaning:'解析時点の降水。現在の浸水深ではありません。',fetchedAt:1789437600000,sourceUpdatedAt:null,sourceUpdatedAtMeaning:'不明',validAt:null,issuedAt:null,bounds:[139.84,35.68,139.92,35.76],coverage:{envelope:[122,20,154,46],description:'日本'},tiles:[],noDataMask:null,unknowns:['提供元との通信に失敗しました']};
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  await act(async () => root.render(<DisasterPanel settings={{region:regions[0]!,layerIds:['rainfall']}} layers={[layer]} busy={false} error="更新できませんでした" enabled installed demo={false} onSettings={onSettings} onRefresh={onRefresh} onEnabled={onEnabled} onInstall={vi.fn()} onLayer={vi.fn()} onFocus={vi.fn()} tab="layers" setTab={vi.fn()}/>));
  expect(host.querySelector('[role=alert]')?.textContent).toContain('更新できません');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="降水の状況の詳細"]')!.click());
  expect(host.textContent).toContain('提供元との通信に失敗しました');
  expect(host.textContent).toContain('未確認 · 不明');
  expect(host.querySelector<HTMLInputElement>('input:checked')?.disabled).toBe(true);
  const select = host.querySelector('select')!;
  await act(async () => {select.value='名古屋・本山';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(onSettings).toHaveBeenCalledWith({region:regions[1],layerIds:['rainfall']});
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '防災レイヤーを停止')!.click());
  expect(onEnabled).toHaveBeenCalledWith(false);
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '再試行')!.click());
  expect(onRefresh).toHaveBeenCalledOnce();
  await act(async () => root.unmount()); host.remove();
});
