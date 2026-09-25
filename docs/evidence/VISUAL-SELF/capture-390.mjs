import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const session = 'visual-self-185-capture';
const base = 'http://127.0.0.1:5173';
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
const output = 'docs/evidence/VISUAL-SELF/captures-2026-09-25';
mkdirSync(output, { recursive: true });
function browser(...args) {
  return execFileSync('npx', ['agent-browser', '--session', session, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
browser('set', 'viewport', '390', '844');
const results = [];
for (const [name, route] of screens) {
  browser('open', base + route);
  const snapshot = browser('snapshot', '-i');
  const screenshot = `${output}/${name}-390.png`;
  browser('screenshot', screenshot);
  results.push({ name, route, screenshot, interactive: snapshot.split('\n').filter(line => line.includes('[ref=')).length, mapFailure: snapshot.includes('地図の接続設定がありません') });
  console.log(`${name}: ${results.at(-1).interactive} controls${results.at(-1).mapFailure ? ', Mapbox unavailable' : ''}`);
}
writeFileSync(`${output}/manifest.json`, JSON.stringify({ viewport: [390, 844], mode: 'display fixture; API disconnected', results }, null, 2) + '\n');
browser('close');
