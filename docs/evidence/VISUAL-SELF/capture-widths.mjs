import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const base = 'http://127.0.0.1:5173';
const session = 'visual-self-185-widths';
const output = 'docs/evidence/VISUAL-SELF/captures-widths-2026-09-25';
const screens = [
  ['self-home', '/docs/evidence/VISUAL-SELF/reflection.html?page=self-home'],
  ['diary', '/docs/evidence/VISUAL-SELF/reflection.html?page=diary'],
  ['reflection-question', '/docs/evidence/VISUAL-SELF/reflection.html?page=question'],
  ['reflection-history', '/docs/evidence/VISUAL-SELF/reflection.html?page=history'],
  ['experience-compare', '/docs/evidence/VISUAL-SELF/reflection.html?page=compare'],
  ['memo-edit', '/docs/evidence/VISUAL-SELF/reflection.html?page=memo'],
  ['type-diagnosis', '/docs/evidence/UI-INSIGHTS/preview/index.html?page=type-diagnosis'],
  ['trend-evidence', '/docs/evidence/UI-INSIGHTS/preview/index.html?page=trend-evidence'],
  ['trend-review', '/docs/evidence/UI-INSIGHTS/preview/index.html?page=trend-review'],
  ['themes', '/docs/evidence/UI-INSIGHTS/preview/index.html?page=themes'],
  ['theme-edit', '/docs/evidence/UI-INSIGHTS/preview/index.html?page=theme-edit'],
  ['self-checkin', '/docs/evidence/VISUAL-SELF/suggestions.html?page=checkin'],
  ['suggestions', '/docs/evidence/VISUAL-SELF/suggestions.html?page=list'],
  ['suggestion-detail', '/docs/evidence/VISUAL-SELF/suggestions.html?page=detail'],
];
mkdirSync(`${output}/reference`, { recursive: true });
mkdirSync(`${output}/desktop`, { recursive: true });
function browser(...args) {
  return execFileSync('npx', ['agent-browser', '--session', session, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
const results = [];
for (const [name, route] of screens) {
  const page = JSON.parse(readFileSync(`docs/01_requirements/03_pages/${name}/page.json`, 'utf8'));
  const reference = page.references[0];
  const viewport = page.viewports.find(item => item.id === reference.viewport);
  if (!viewport) throw new Error(`Missing reference viewport: ${name}`);
  const source = `docs/01_requirements/03_pages/references/${reference.image.split('/').at(-1)}`;
  for (const [kind, width, height] of [['reference', viewport.width, viewport.height], ['desktop', 1440, 900]]) {
    browser('set', 'viewport', String(width), String(height));
    browser('open', base + route);
    const snapshot = browser('snapshot', '-i');
    const screenshot = `${output}/${kind}/${name}.png`;
    browser('screenshot', screenshot);
    results.push({ name, kind, width, height, source, screenshot, controls: snapshot.split('\n').filter(line => line.includes('[ref=')).length, mapFailure: snapshot.includes('地図の接続設定がありません') });
  }
  console.log(`${name}: reference ${viewport.width}x${viewport.height}, desktop 1440x900`);
}
writeFileSync(`${output}/manifest.json`, JSON.stringify({ mode: 'display fixture; API disconnected', results }, null, 2) + '\n');
browser('close');
