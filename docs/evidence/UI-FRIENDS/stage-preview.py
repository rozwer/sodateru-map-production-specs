"""Copy current provider files for an isolated, explicitly mocked UI check."""
from pathlib import Path
import shutil
repo = Path(__file__).resolve().parents[3]
qa = Path('/private/tmp/ui-friends-qa-14')
providers = [('/Users/roz/.codex/worktrees/ui-base-4/src/app', 'src/app'), ('/Users/roz/.codex/worktrees/ui-base-4/src/ui', 'src/ui'), (str(repo / 'src/messages.ts'), 'src/messages.ts'), ('/Users/roz/.codex/worktrees/ui-map-8/src/map', 'src/map'), ('/Users/roz/.codex/worktrees/ui-map-8/src/features/map', 'src/features/map'), (str(repo / 'packages'), 'packages'), (str(repo / 'src/features/friends'), 'src/features/friends'), (str(repo / 'docs/evidence/UI-FRIENDS'), 'docs/evidence/UI-FRIENDS')]
qa.mkdir(exist_ok=True)
for source, destination in providers:
    if Path(source).is_dir(): shutil.copytree(source, qa / destination, dirs_exist_ok=True)
    else: shutil.copy2(source, qa / destination)
if not (qa / 'node_modules').exists():
    (qa / 'node_modules').symlink_to('/Users/roz/Desktop/sodateru-worktrees/koshiro-3-core/node_modules', target_is_directory=True)
(qa / 'package.json').write_text('{"type":"module"}')
(qa / 'index.html').write_text('<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>UI-FRIENDS 視覚確認・テスト応答</title></head><body><div id="root"></div><script type="module" src="/docs/evidence/UI-FRIENDS/fixture.tsx"></script></body></html>')
(qa / 'vite.config.mjs').write_text("import {defineConfig} from 'vite'; export default defineConfig({envDir:'/Users/roz/.codex/worktrees/ui-friends-14',esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5214,strictPort:true}})")
print(qa)
