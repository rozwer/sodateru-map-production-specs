"""Focused policy tests that do not require a remote task board."""
import os
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import production_guard as guard
import taskctl as tc


class ProductionGuard(unittest.TestCase):
    def test_claimed_paths_are_exact_or_under_directory_prefix(self):
        guard.allowed(['docs/a.md', 'src/feature/file.ts'], ['docs/a.md', 'src/feature/'])

    def test_claimed_paths_reject_outside_change(self):
        with self.assertRaisesRegex(tc.BoardError, 'outside claim'):
            guard.allowed(['README.md'], ['docs/'])

    def test_bootstrap_mode_and_branch_name(self):
        def fake_git(*args, **kwargs):
            if args[:3] == ('config', '--bool', '--get'):
                return 'true'
            return ''
        with patch.object(guard.tc, 'git', side_effect=fake_git):
            self.assertTrue(guard.bootstrap_enabled())
        self.assertTrue(guard.bootstrap_branch('bootstrap/assign-owners'))
        self.assertFalse(guard.bootstrap_branch('develop'))
        self.assertFalse(guard.bootstrap_branch('bootstrap/Assign_owners'))

    def test_initial_bootstrap_reference_updates_only_main(self):
        ones, twos, zeros = '1' * 40, '2' * 40, '0' * 40
        def fake_git(*args, **kwargs):
            if args == ('branch', '--show-current'):return 'main'
            if args[:3] == ('config', '--bool', '--get'):return 'true'
            if args[:3] == ('rev-parse', '--verify', 'refs/remotes/origin/develop'):return ''
            return ''
        for ref, new, accepted in [('main', twos, True), ('topic', twos, False), ('main', zeros, False)]:
            with self.subTest(ref=ref, new=new), \
                 patch.object(sys, 'argv', ['guard', 'refs', 'prepared']), \
                 patch.object(sys, 'stdin', io.StringIO(f'{ones} {new} refs/heads/{ref}\n{ones} {new} HEAD\n')), \
                 patch.object(guard.tc, 'git', side_effect=fake_git), \
                 patch.object(guard.tc, 'read_board', return_value=(None, None)):
                if accepted:
                    guard.main()
                else:
                    with self.assertRaisesRegex(tc.BoardError, 'Initial bootstrap'):
                        guard.main()

    def test_initial_bootstrap_push_rejects_non_main_target(self):
        zeros = '0' * 40
        ones = '1' * 40
        stdin = io.StringIO(f'refs/heads/main {ones} refs/heads/topic {zeros}\n')
        def fake_git(*args, **kwargs):
            if args == ('branch', '--show-current'):
                return 'main'
            if args[:3] == ('config', '--bool', '--get'):
                return 'true'
            return ''
        with patch.object(sys, 'argv', ['guard', 'pre-push']), \
             patch.object(sys, 'stdin', stdin), \
             patch.object(guard.tc, 'git', side_effect=fake_git), \
             patch.object(guard.tc, 'read_board', return_value=(None, None)), \
             self.assertRaisesRegex(tc.BoardError, 'pushes to main only'):
            guard.main()

    def test_preboard_reference_updates_start_from_develop(self):
        zeros, main, develop, next_oid = '0' * 40, '1' * 40, '2' * 40, '3' * 40
        def fake_git(*args, **kwargs):
            if args == ('branch', '--show-current'):return 'main'
            if args[:3] == ('config', '--bool', '--get'):return 'true'
            if args[:3] == ('rev-parse', '--verify', 'refs/remotes/origin/develop'):return develop
            if args[:3] == ('rev-parse', '--verify', 'refs/remotes/origin/main'):return main
            return ''
        cases=[
            (f'{zeros} {develop} refs/heads/develop\n',True),
            (f'{zeros} {develop} refs/heads/bootstrap/issue-setup\n',True),
            (f'{zeros} {next_oid} refs/heads/bootstrap/issue-setup\n',False),
            (f'{main} {next_oid} refs/heads/main\n',False),
            (f'{zeros} {develop} refs/heads/topic\n',False),
        ]
        for data,accepted in cases:
            with self.subTest(data=data), \
                 patch.object(sys,'argv',['guard','refs','prepared']), \
                 patch.object(sys,'stdin',io.StringIO(data)), \
                 patch.object(guard.tc,'git',side_effect=fake_git), \
                 patch.object(guard.tc,'read_board',return_value=(None,None)):
                if accepted:guard.main()
                else:
                    with self.assertRaises(tc.BoardError):guard.main()

    def test_preboard_push_allows_only_same_named_bootstrap_branch(self):
        zeros, develop, tip = '0' * 40, '2' * 40, '3' * 40
        def fake_git(*args, **kwargs):
            if args == ('branch', '--show-current'):return 'bootstrap/issue-setup'
            if args[:3] == ('config', '--bool', '--get'):return 'true'
            if args[:3] == ('rev-parse', '--verify', 'refs/remotes/origin/develop'):return develop
            return ''
        accepted=io.StringIO(f'refs/heads/bootstrap/issue-setup {tip} refs/heads/bootstrap/issue-setup {zeros}\n')
        rejected=io.StringIO(f'refs/heads/develop {tip} refs/heads/develop {develop}\n')
        with patch.object(sys,'argv',['guard','pre-push']), \
             patch.object(sys,'stdin',accepted), \
             patch.object(guard.tc,'git',side_effect=fake_git), \
             patch.object(guard.tc,'read_board',return_value=(None,None)), \
             patch.object(guard,'ancestor',return_value=True):
            guard.main()
        with patch.object(sys,'argv',['guard','pre-push']), \
             patch.object(sys,'stdin',rejected), \
             patch.object(guard.tc,'git',side_effect=fake_git), \
             patch.object(guard.tc,'read_board',return_value=(None,None)), \
             self.assertRaisesRegex(tc.BoardError,'merge a PR into develop'):
            guard.main()


if __name__ == '__main__':
    unittest.main()
