#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const checkOnly = process.argv.slice(2).includes('--check');
const packagePath = resolve(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

const checks = [
  ['package.json scripts.dev', typeof packageJson.scripts?.dev === 'string'],
  ['tools/local/dev.ts', existsSync(resolve(root, 'tools/local/dev.ts'))],
  ['server/app/main.ts', existsSync(resolve(root, 'server/app/main.ts'))],
  ['index.html', existsSync(resolve(root, 'index.html'))],
  ['Vite dependency', existsSync(resolve(root, 'node_modules/vite/bin/vite.js'))],
];

console.log('育てる地図 manual QA preflight');
for (const [label, ready] of checks) console.log(`${ready ? 'OK  ' : 'WAIT'} ${label}`);

const webHost = process.env.SODATERU_WEB_HOST ?? '127.0.0.1';
const apiHost = process.env.SODATERU_HOST ?? '127.0.0.1';
const apiPort = process.env.SODATERU_PORT ?? '3001';
console.log(`UI  : ViteのLocal表示を使用（既定 http://${webHost}:5173/）`);
console.log(`API : http://${apiHost}:${apiPort}/`);
console.log(`live DB: ${process.env.SODATERU_DB_PATH ?? resolve(root, '.local/app.sqlite')}`);
console.log(`demo DB: ${process.env.SODATERU_DEMO_DB_PATH ?? resolve(root, '.local/demo.sqlite')}`);

const missing = checks.filter(([, ready]) => !ready).map(([label]) => label);
if (missing.length) {
  console.error(`\n未統合または未導入: ${missing.join(', ')}`);
  if (missing.includes('Vite dependency')) {
    console.error('依存だけが不足している場合: mise exec -- bun install --frozen-lockfile');
  }
  console.error('CORE/UI-BASEがdevelopへ統合された後、同じ --check を再実行してください。');
  process.exitCode = 2;
} else if (checkOnly) {
  console.log('\nREADY: mise exec -- bun qa/manual/run.mjs で起動できます。');
} else {
  console.log('\n既存の bun run dev を開始します。終了は Ctrl+C。');
  const child = spawn('bun', ['run', 'dev'], { cwd: root, env: process.env, stdio: 'inherit' });
  let stopping = false;
  const stop = signal => {
    if (stopping) return;
    stopping = true;
    if (child.exitCode === null) child.kill(signal);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
  child.on('error', error => {
    console.error(`起動失敗: ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal && signal !== 'SIGINT' && signal !== 'SIGTERM') {
      console.error(`dev process stopped by ${signal}`);
    }
    process.exitCode = code ?? (signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
  });
}
