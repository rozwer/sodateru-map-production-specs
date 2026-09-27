// @vitest-environment node
import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createApp } from '../../server/app/app';
import { openDatabases } from '../../server/db/connection';
import { loadLocalIdentity, seedProfiles } from '../../server/core/session';
import { createApiClient, type ApiClient } from '../../packages/api-client/index';
const binding = vi.hoisted(() => ({ client: null as ApiClient | null }));
vi.mock('./api', () => ({ get api() { return binding.client!; } }));
import { useLocalSession, type SessionController } from './session';
import { App } from './App';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('connects shell navigation and person/mode changes to real HTTP with stale response rejection and restart restore', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost/'});
  for (const key of ['window', 'document', 'location', 'history', 'localStorage', 'HTMLElement', 'Element', 'MouseEvent'] as const) vi.stubGlobal(key, dom.window[key]);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  localStorage.clear(); history.replaceState(null, '', '#/map');
  const directory = mkdtempSync(join(tmpdir(), 'connect-base-http-'));
  const paths = { livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite') };
  const identity = loadLocalIdentity(join(directory, 'profiles.json'));
  identity.profiles.push({ key: 'other', id: randomUUID(), name: '別の本人' });
  let databases = openDatabases(paths);
  let server!: Server, origin = '';
  async function boot() {
    seedProfiles(databases, identity.profiles);
    const app = createApp({databases, identity, features: []});
    await new Promise<void>(resolve => { server = serve({fetch: app.fetch, hostname: '127.0.0.1', port: 0}, address => { origin = `http://127.0.0.1:${address.port}`; resolve(); }) as Server; });
  }
  async function stop() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); databases.close(); }
  await boot();
  const cookies = new Map<string, string>();
  const requests: { method: string; path: string; mode: string | null; status: number; key: string | null }[] = [];
  let loseSessionResponse = true;
  let holdMe = false, heldSignal: AbortSignal | undefined, release: (() => void) | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Cookie', [...cookies].map(([key,value]) => `${key}=${value}`).join('; '));
    const response = await fetch(origin + String(url), {...init, headers});
    requests.push({method: init?.method ?? 'GET', path: String(url), mode: headers.get('X-Data-Mode'), status: response.status, key: headers.get('Idempotency-Key')});
    if (loseSessionResponse && init?.method === 'POST' && String(url) === '/api/v1/session') {
      loseSessionResponse = false;
      throw new TypeError('Simulated response loss after real server commit');
    }
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]!; const at = pair.indexOf('='); cookies.set(pair.slice(0,at), pair.slice(at+1)); }
    if (holdMe && String(url).endsWith('/me')) {
      holdMe = false; heldSignal = init?.signal ?? undefined;
      // The response is from the real server; hold delivery to simulate a late transport.
      await new Promise<void>(resolve => { release = resolve; });
    }
    return response;
  };
  binding.client = createApiClient({fetch: fetcher});
  let controller!: SessionController;
  function Probe() {
    controller = useLocalSession();
    return controller.session ? <App scopeKey={`${controller.dataMode}:${controller.session.person.id}`} screens={[
      {id:'self-home', title:'本人画面', component: () => <p>{controller.session!.person.id}</p>},
    ]}/> : <p>本人未開始</p>;
  }
  const host = document.createElement('div'); document.body.append(host); let root = createRoot(host);
  async function until(check: () => boolean) { for(let i=0;i<150 && !check();i++) await act(async () => { await new Promise(resolve=>setTimeout(resolve,10)); }); expect(check()).toBe(true); }
  try {
    await act(async () => root.render(<Probe/>)); await until(() => !controller.busy);
    expect(controller.session).toBeNull();
    expect(requests.some(r=>r.path==='/api/v1/session' && r.status===401)).toBe(true);
    await act(async () => { expect(await controller.start()).toBe(false); });
    expect(controller.session).toBeNull();
    expect(controller.error).toBeTruthy();
    await act(async () => { expect(await controller.start()).toBe(true); });
    const attempts = requests.filter(r => r.method === 'POST');
    expect(attempts).toHaveLength(2);
    expect(attempts[0]!.key).toBeTruthy();
    expect(attempts[1]!.key).toBe(attempts[0]!.key);
    expect(databases.live.prepare('SELECT count(*) AS count FROM core_sessions').get()!.count).toBe(1);
    expect(controller.session!.person.id).toBe(identity.profiles[0]!.id);
    const writes = () => requests.filter(r=>r.method!=='GET');
    const mutations = writes().length;
    await act(async () => host.querySelector<HTMLButtonElement>('.sm-bottom-nav button')!.click());
    await act(async () => host.querySelector<HTMLButtonElement>('.sm-bottom-nav__map')!.click());
    expect(writes()).toHaveLength(mutations);
    holdMe = true;
    const old = binding.client.request('getMe', {}).then(()=> 'accepted', error=>error.name);
    await until(() => !!release);
    await act(async () => controller.selectProfile('other'));
    await act(async () => { await controller.start(); });
    expect(heldSignal!.aborted).toBe(true); release!(); release=undefined;
    expect(await old).toBe('AbortError');
    expect(controller.session!.person.id).toBe(identity.profiles[1]!.id);
    holdMe = true;
    const oldMode = binding.client.request('getMe', {}).then(()=> 'accepted', error=>error.name);
    await until(() => !!release);
    await act(async () => controller.switchMode('demo'));
    expect(heldSignal!.aborted).toBe(true); release!(); release=undefined;
    expect(await oldMode).toBe('AbortError'); await until(() => !controller.busy);
    expect(controller.session).toBeNull();
    await act(async () => { await controller.start(); });
    expect(controller.session!.dataMode).toBe('demo');
    expect(controller.session!.person.id).toBe(identity.profiles[0]!.id);
    await act(async () => controller.switchMode('live')); await until(() => !controller.busy);
    expect(controller.session!.person.id).toBe(identity.profiles[1]!.id);
    const countBeforeRestart = writes().length;
    await act(async () => root.unmount()); await stop();
    databases = openDatabases(paths); await boot();
    root = createRoot(host); await act(async () => root.render(<Probe/>)); await until(() => !controller.busy);
    expect(controller.session!.person.id).toBe(identity.profiles[1]!.id);
    expect(writes()).toHaveLength(countBeforeRestart);
    expect(writes().map(r=>[r.method,r.path,r.mode,r.status])).toEqual([
      ['POST','/api/v1/session','live',201], ['POST','/api/v1/session','live',200], ['POST','/api/v1/session','live',201], ['POST','/api/v1/session','demo',201],
    ]);
  } finally {
    release?.(); await act(async () => root.unmount()); host.remove(); await stop(); vi.unstubAllGlobals(); dom.window.close();
  }
}, 15000);
