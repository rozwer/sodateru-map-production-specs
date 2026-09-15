"""Isolated actual-HTTP preview; copies provider code without changing its worktree."""
from pathlib import Path
import json, shutil, subprocess
repo = Path(__file__).resolve().parents[3]
qa = Path('/private/tmp/ui-friends-qa-14')
subprocess.run(['python3', str(repo / 'docs/evidence/UI-FRIENDS/stage-preview.py')], check=True)
shutil.copytree(repo / 'server', qa / 'server', dirs_exist_ok=True)
for ref, paths in [('ca562f44f1c20804413869f244b2651871a217d1', ['server/features/community', 'server/features/friends', 'server/db/migrations/community']), ('d2201571fe47012f909ddf9ed2be548aec5cb245', ['server/information'])]:
    names = subprocess.check_output(['git','ls-tree','-r','--name-only',ref,*paths], cwd=repo).decode().splitlines()
    for name in names:
        target = qa / name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(subprocess.check_output(['git','show',f'{ref}:{name}'],cwd=repo))
api = qa / 'docs/01_requirements/04_api'
spec = json.loads((repo / 'docs/01_requirements/04_api/openapi.json').read_text())
fragments = [json.loads((repo / f'docs/01_requirements/04_api/fragments/{name}.json').read_text()) for name in ['RECORDS','SETTINGS','ROUTES','THEMES']]
fragments.append(json.loads(subprocess.check_output(['git','show','ca562f44f1c20804413869f244b2651871a217d1:docs/01_requirements/04_api/fragments/COMMUNITY.json'],cwd=repo)))
for fragment in fragments:
    spec['components']['schemas'].update(fragment.get('schemas',{}))
    for operation in fragment.get('operations',[]):
        entry = operation.copy()
        method, path = entry.pop('method'), entry.pop('path')
        entry.pop('replaceOperation',None)
        spec['paths'].setdefault(path,{})[method] = entry
(api / 'openapi.json').write_text(json.dumps(spec))
subprocess.run(['node',str(api / 'tools/generate-client.mjs')],check=True)
(qa / 'live.html').write_text('<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>UI-FRIENDS 実API確認</title></head><body><div id="root"></div><script type="module" src="/docs/evidence/UI-FRIENDS/live.tsx"></script></body></html>')
(qa / 'vite.config.mjs').write_text("import {defineConfig} from 'vite'; export default defineConfig({envDir:'/Users/roz/.codex/worktrees/ui-friends-14',esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5214,strictPort:true,proxy:{'/api':'http://127.0.0.1:3114'}}})")
print('Actual providers staged; use live-server.ts and /live.html.')
