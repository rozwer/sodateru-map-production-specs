#!/usr/bin/env node

import { randomUUID } from 'node:crypto';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalized(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

const uiOrigin = normalized(option('--ui', process.env.SODATERU_QA_UI_URL ?? 'http://127.0.0.1:5173/'));
const apiOrigin = normalized(option('--api', process.env.SODATERU_QA_API_URL ?? 'http://127.0.0.1:3001/'));
const results = [];

async function checkUi() {
  const response = await fetch(uiOrigin, { signal: AbortSignal.timeout(5000) });
  const body = await response.text();
  const html = response.headers.get('content-type')?.includes('text/html') && /<html|<!doctype/i.test(body);
  if (!response.ok || !html) throw new Error(`UI ${response.status}: HTMLを取得できません`);
  results.push(`OK   UI ${uiOrigin} (${response.status}, HTML)`);
}

async function checkMode(mode) {
  const target = new URL('api/v1/session/profiles', apiOrigin);
  const response = await fetch(target, {
    headers: {
      'X-Request-Id': randomUUID(),
      'X-Data-Mode': mode,
    },
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json().catch(() => null);
  const items = body?.items;
  if (!response.ok || !Array.isArray(items)) {
    throw new Error(`API ${mode} ${response.status}: profiles応答が契約外です`);
  }
  const echoedMode = response.headers.get('x-data-mode');
  if (echoedMode !== mode) throw new Error(`API ${mode}: X-Data-Mode応答が ${echoedMode ?? 'ありません'}`);
  results.push(`OK   API ${mode} ${target} (${response.status}, profiles ${items.length})`);
}

try {
  await checkUi();
  await checkMode('live');
  await checkMode('demo');
  console.log(results.join('\n'));
  console.log('READY: 起動とlive/demoのAPI入口に到達できます。保存再表示はREADMEの実画面手順で確認してください。');
} catch (error) {
  for (const result of results) console.log(result);
  console.error(`WAIT ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
