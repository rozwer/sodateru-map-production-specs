import { mkdir, readFile, writeFile, rename, readdir, unlink, open } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';

export const defaultRoot = () => process.env.ISSUE_ROUTER_HOME || path.join(homedir(), '.codex', 'issue-router');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function repoName(value) {
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value) || value.split('/').some(x => ['.', '..'].includes(x))) throw Error('Expected owner/repository');
  return value.toLowerCase();
}
export function issueNumber(value) {
  if (!/^[1-9][0-9]*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw Error('Invalid issue number');
  return Number(value);
}
export function threadId(value) {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(value || '')) throw Error('A valid --thread or CODEX_THREAD_ID is required');
  return value;
}
export async function readJSON(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}
export async function atomicJSON(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 }); await rename(temp, file); }
  finally { await unlink(temp).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}
async function files(dir) {
  try { return await readdir(dir, { withFileTypes: true }); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
export class Store {
  constructor(root = defaultRoot()) { this.root = path.resolve(root); }
  configPath() { return path.join(this.root, 'config.json'); }
  config() { return readJSON(this.configPath()); }
  routePath(r) { return path.join(this.root, 'routes', repoName(r.repo), String(issueNumber(r.issue)), `${threadId(r.threadId)}.json`); }
  async routesForIssue(repo, issue) {
    const dir = path.join(this.root, 'routes', repoName(repo), String(issueNumber(issue)));
    const out = [];
    for (const entry of await files(dir)) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const file = path.join(dir, entry.name);
      const r = await readJSON(file);
      if (this.routePath(r) !== file) throw Error(`Invalid route file: ${file}`);
      out.push(r);
    }
    return out;
  }
  async register(r) {
    const file = this.routePath(r);
    const old = await readJSON(file, null);
    if (old && old.repo === repoName(r.repo) && old.issue === issueNumber(r.issue) && old.threadId === r.threadId && old.hostId === r.hostId) return;
    await atomicJSON(file, { ...r, repo: repoName(r.repo), issue: issueNumber(r.issue), registeredAt: old?.registeredAt ?? new Date().toISOString() });
  }
  async unregister(r) { await unlink(this.routePath(r)); }
  async routes() {
    const result = [];
    const walk = async dir => {
      for (const entry of await files(dir)) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(file);
        else if (entry.isFile() && entry.name.endsWith('.json')) {
          const r = await readJSON(file);
          if (this.routePath(r) !== file) throw Error(`Invalid route file: ${file}`);
          result.push(r);
        }
      }
    };
    await walk(path.join(this.root, 'routes'));
    return result;
  }
  deliveryPath(key) { return path.join(this.root, 'deliveries', `${digest(key)}.json`); }
  delivery(key) { return readJSON(this.deliveryPath(key), null); }
  putDelivery(d) { return atomicJSON(this.deliveryPath(d.key), { ...d, updatedAt: new Date().toISOString() }); }
  async deliveries() {
    const out = [];
    for (const f of await files(path.join(this.root, 'deliveries'))) if (f.isFile() && f.name.endsWith('.json')) out.push(await readJSON(path.join(this.root, 'deliveries', f.name)));
    return out;
  }
  cursorPath(repo, issue) { return path.join(this.root, 'cursors', `${digest(`${repo}#${issue}`)}.json`); }
  async lock() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const file = path.join(this.root, 'watch.pid');
    try {
      const fd = await open(file, 'wx', 0o600);
      await fd.writeFile(String(process.pid)); await fd.close();
      return async () => { if ((await readFile(file, 'utf8')) === String(process.pid)) await unlink(file); };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const pid = Number(await readFile(file, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid < 1) throw Error(`Invalid PID file: ${file}`);
      try { process.kill(pid, 0); } catch (x) {
        if (x.code === 'ESRCH') { await unlink(file); return this.lock(); }
        throw x;
      }
      throw Error(`A watcher is already running (PID ${pid})`);
    }
  }
}
