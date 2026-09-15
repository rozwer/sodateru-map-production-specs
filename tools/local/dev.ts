import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const children = [spawn(process.execPath, ['--experimental-transform-types', '--env-file-if-exists=.env', 'server/app/main.ts'], { cwd: root, stdio: 'inherit', env: process.env })];
if (existsSync(new URL('../../index.html', import.meta.url))) {
  children.push(spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', process.env.SODATERU_WEB_HOST ?? '127.0.0.1'], { cwd: root, stdio: 'inherit', env: process.env }));
} else {
  console.log('API started. UI-BASE index.html is not integrated in this checkout yet.');
}
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 1));
}
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
