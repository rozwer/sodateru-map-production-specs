import type { AtlasClip } from './AtlasPreview';
import type { PreviewAction } from './views';

// Existing rehearsal codex-v2 renderer and validated pet-package use this grid.
// This is a renderer table; ZIP acceptance remains owned by COMPANION on the server.
const animations = {
  idle: { label: '立つ', row: 0, durations: [280, 110, 110, 140, 140, 320] },
  'running-right': { label: '右へ走る', row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  'running-left': { label: '左へ走る', row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { label: '手を振る', row: 3, durations: [140, 140, 140, 280] },
  jumping: { label: '跳ねる', row: 4, durations: [140, 140, 140, 140, 280] },
  failed: { label: '困る', row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { label: '待つ', row: 6, durations: [150, 150, 150, 150, 150, 260] },
  running: { label: '考える', row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { label: '見せる', row: 8, durations: [150, 150, 150, 150, 150, 280] },
} as const;
export function v2Clip(url: string, action: keyof typeof animations): AtlasClip {
  const definition = animations[action];
  return { url, frames: definition.durations.map((durationMs, column) => ({ x: column * 192, y: definition.row * 208, width: 192, height: 208, durationMs })) };
}
export function v2Actions(url: string, actions: string[]): PreviewAction[] {
  return actions.map(id => {
    if (id.startsWith('gaze-')) {
      const angle = Number(id.slice(5));
      const direction = angle / 22.5;
      if (id !== `gaze-${angle}` || !Number.isInteger(direction) || direction < 0 || direction >= 16) throw new Error(`視線「${id}」の表示形式を確認できません。`);
      return { id, label: `視線 ${angle}°`, clip: { url, frames: [{ x: direction % 8 * 192, y: (9 + Math.floor(direction / 8)) * 208, width: 192, height: 208, durationMs: 200 }] } };
    }
    if (!(id in animations)) throw new Error(`動作「${id}」の表示形式を確認できません。登録はまだ行っていません。`);
    const key = id as keyof typeof animations;
    return { id, label: animations[key].label, clip: v2Clip(url, key) };
  }).sort((a, b) => {
    const order = ['idle', 'waving', 'waiting'];
    const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
    return rank(a.id) - rank(b.id);
  });
}

