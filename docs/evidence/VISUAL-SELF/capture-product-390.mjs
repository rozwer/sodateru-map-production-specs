import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

// Run after selecting the demo person in the visual-self-185 browser session.
const session = 'visual-self-185';
const base = 'http://127.0.0.1:5173/';
const pages = [
  ['self-home', 'self-home'], ['diary', 'diary'],
  ['reflection-question', 'reflection-question'], ['reflection-history', 'reflection-history'],
  ['experience-compare', 'experience-compare'], ['memo-edit', 'memo-edit'],
  ['type-diagnosis', 'type-diagnosis'], ['trend-evidence', 'trend-evidence'],
  ['trend-review', 'trend-review'], ['themes', 'themes'], ['theme-edit', 'theme-edit'],
  ['self-checkin', 'self-checkin'], ['suggestions', 'suggestions'],
  ['suggestion-detail', 'suggestion-detail'],
];
const output = 'docs/evidence/VISUAL-SELF/product-captures-2026-09-25';
mkdirSync(output, { recursive: true });
function browser(...args) {
  return execFileSync('npx', ['agent-browser', '--session', session, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
browser('set', 'viewport', '390', '844');
const results = [];
for (const [name, route] of pages) {
  browser('open', `${base}#/${route}`);
  const snapshot = browser('snapshot', '-c');
  const screenshot = `${output}/${name}-390.png`;
  browser('screenshot', screenshot);
  results.push({ name, route: `#/${route}`, screenshot, mapFailure: snapshot.includes('地図の接続設定がありません'), visibleText: snapshot.split('\n').filter(line => line.includes('StaticText')).map(line => line.trim()).slice(-8) });
  console.log(`${name}: ${results.at(-1).visibleText.join(' | ').slice(0, 180)}`);
}
writeFileSync(`${output}/manifest.json`, JSON.stringify({ viewport: [390, 844], dataMode: 'demo product', results }, null, 2) + '\n');
