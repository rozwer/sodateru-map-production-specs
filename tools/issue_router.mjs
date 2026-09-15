#!/usr/bin/env node
import { main, relayPrompt } from './vendor/codex-issue-router/bin/router.mjs';
import { Store, repoName } from './vendor/codex-issue-router/src/store.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(import.meta.url);
export async function projectMain(args = process.argv.slice(2), directory = path.dirname(path.dirname(cli))) {
  if (args.some(x => /^--root(?:=|$)/.test(x))) throw Error('This wrapper is repository-local; --root overrides are not allowed');
  const git = (...a) => execFileSync('git', ['-C', directory, ...a], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  // Shared by this clone's linked worktrees, never by unrelated repositories.
  const root = path.join(git('rev-parse','--path-format=absolute','--git-common-dir'),'issue-router');
  let origin = '';
  try { origin = git('remote','get-url','origin'); } catch { /* bootstrap, not configured */ }
  const match = origin.match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)\/?$/);
  const repo = match ? repoName(match[1].replace(/\.git$/,'')) : null;
  const command = args[0];
  const local = new Store(root);
  const config = await local.config().catch(e => { if(e.code==='ENOENT')return null;throw e; });
  if (config && (!repo || Object.keys(config.repos).some(r => r !== repo))) throw Error('Router configuration does not match this repository origin; no delivery performed');
  if (command === 'relay-prompt') {
    console.log('このリポジトリだけを対象にします。グローバル登録や他リポジトリを読みません。originと専用設定が未準備なら停止してください。\n'
      + relayPrompt(cli,root).replaceAll(' --root '+JSON.stringify(root),'').replaceAll(' --root <root>',''));
    return;
  }
  if (command && !['help','status'].includes(command) && !args.includes('--help') && !repo) throw Error('Set this repository GitHub origin first; other repositories cannot be used as a fallback');
  const supplied = args.flatMap((value,index) => value==='--repo' ? [args[index+1]] : value.startsWith('--repo=') ? [value.slice(7)] : []);
  if(supplied.some(value => repoName(value || '') !== repo)) throw Error('--repo must match this repository GitHub origin');
  const automaticRepo = ['init','register','unregister'].includes(command) && !supplied.length ? ['--repo',repo] : [];
  await main([...args,...automaticRepo,'--root',root]);
}
if(process.argv[1] && path.resolve(process.argv[1])===cli) projectMain().catch(error => { console.error(error.message); process.exitCode = 1; });
