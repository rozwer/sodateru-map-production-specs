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

    def test_bootstrap_mode_only_applies_to_main(self):
        def fake_git(*args, **kwargs):
            if args[:3] == ('config', '--bool', '--get'):
                return 'true'
            return ''
        with patch.object(guard.tc, 'git', side_effect=fake_git):
            self.assertTrue(guard.bootstrap_mode('main'))
            self.assertFalse(guard.bootstrap_mode('develop'))

    def test_bootstrap_reference_updates(self):
        ones, twos, zeros = '1' * 40, '2' * 40, '0' * 40
        def fake_git(*args, **kwargs):
            return 'main' if args == ('branch', '--show-current') else 'true'
        for ref, new, accepted in [('main', twos, True), ('topic', twos, False), ('main', zeros, False)]:
            with self.subTest(ref=ref, new=new), \
                 patch.object(sys, 'argv', ['guard', 'refs', 'prepared']), \
                 patch.object(sys, 'stdin', io.StringIO(f'{ones} {new} refs/heads/{ref}\n{ones} {new} HEAD\n')), \
                 patch.object(guard.tc, 'git', side_effect=fake_git), \
                 patch.object(guard.tc, 'read_board', return_value=(None, None)):
                if accepted:
                    guard.main()
                else:
                    with self.assertRaisesRegex(tc.BoardError, 'local updates to main only'):
                        guard.main()

    def test_bootstrap_push_rejects_non_main_target(self):
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


if __name__ == '__main__':
    unittest.main()
