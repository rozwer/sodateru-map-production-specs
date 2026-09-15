"""Validate generated Codex hooks and worktree-local Git hook installation."""
from pathlib import Path
import contextlib
import io
import json
import os
import shutil
import subprocess
import tempfile
import unittest

import install_hooks as hooks


class HookInstallation(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='production-hooks ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'repo'
        self.root.mkdir()
        shutil.copytree(hooks.ROOT / '.codex', self.root / '.codex')
        shutil.copytree(hooks.ROOT / '.githooks', self.root / '.githooks')
        self.env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull,
                        GIT_AUTHOR_NAME='Test', GIT_AUTHOR_EMAIL='test@example.invalid',
                        GIT_COMMITTER_NAME='Test', GIT_COMMITTER_EMAIL='test@example.invalid')
        self.git('init', '--initial-branch=main')

    def git(self, *args, cwd=None):
        return subprocess.run(['git', *args], cwd=cwd or self.root, env=self.env,
                              text=True, encoding='utf-8', capture_output=True,
                              check=True).stdout.strip()

    def test_generated_policy_matches_os_sources(self):
        hooks.install(hooks.ROOT, check=True)
        generated = json.loads(hooks.compose(self.root))
        for osname, key in [('macos', 'command'), ('windows', 'commandWindows')]:
            source = json.loads((self.root / f'.codex/hooks.{osname}.json').read_text())
            for event, groups in source['hooks'].items():
                for i, group in enumerate(groups):
                    for j, handler in enumerate(group['hooks']):
                        self.assertEqual(handler['command'], generated['hooks'][event][i]['hooks'][j][key])

    def test_install_is_worktree_local_and_repeatable(self):
        self.git('add', '.')
        self.git('commit', '-m', 'Fixture')
        hooks.bootstrap(self.root)
        other = self.root.parent / 'other'
        self.git('worktree', 'add', '-b', 'other', str(other))
        common = Path(self.git('rev-parse', '--path-format=absolute', '--git-common-dir')) / 'config'
        shared_before = common.read_bytes()
        with contextlib.redirect_stdout(io.StringIO()):
            hooks.install(self.root)
            hooks.install(other)
        expected = '.githooks/windows' if os.name == 'nt' else '.githooks/macos'
        self.assertEqual(self.git('config', '--get', 'core.hooksPath'), expected)
        self.assertEqual(self.git('config', '--get', 'core.hooksPath', cwd=other), expected)
        self.assertEqual(common.read_bytes(), shared_before)

    def test_foreign_hook_path_is_not_overwritten(self):
        hooks.bootstrap(self.root)
        self.git('config', '--worktree', 'core.hooksPath', 'custom-hooks')
        with self.assertRaisesRegex(ValueError, 'Existing core.hooksPath differs'):
            hooks.install(self.root)

    def test_install_requires_bootstrap(self):
        with self.assertRaisesRegex(ValueError, 'hooks:bootstrap'):
            hooks.install(self.root)

    def test_bootstrap_records_setup_mode(self):
        hooks.bootstrap(self.root)
        self.assertEqual(self.git('config', '--local', '--bool', '--get',
                                  'extensions.worktreeConfig'), 'true')
        self.assertEqual(self.git('config', '--local', '--bool', '--get',
                                  'sodateru.bootstrapMode'), 'true')


if __name__ == '__main__':
    unittest.main()
