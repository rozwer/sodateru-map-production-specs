import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apiHost = process.env.SODATERU_HOST ?? '127.0.0.1';
const apiPort = Number(process.env.SODATERU_PORT ?? '3001');
const children = [spawn(process.execPath, ['--experimental-transform-types', '--env-file-if-exists=.env', 'server/app/main.ts'], { cwd: root, stdio: 'inherit', env: process.env })];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}
function watch(child: (typeof children)[number]) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 1));
}
watch(children[0]);
function apiReady() {
  return new Promise<boolean>(resolve => {
    const socket = connect({ host: apiHost, port: apiPort });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
  });
}
async function startUi() {
  const deadline = Date.now() + 10_000;
  while (!stopping && children[0].exitCode === null && Date.now() < deadline) {
    if (await apiReady()) {
      if (stopping || children[0].exitCode !== null) return;
      const ui = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', process.env.SODATERU_WEB_HOST ?? '127.0.0.1'], { cwd: root, stdio: 'inherit', env: process.env });
      children.push(ui); watch(ui); return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!stopping) { console.error(`API did not become ready at ${apiHost}:${apiPort} within 10 seconds`); stop(1); }
}
if (existsSync(new URL('../../index.html', import.meta.url))) void startUi();
else console.log('API started. UI-BASE index.html is not integrated in this checkout yet.');
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
