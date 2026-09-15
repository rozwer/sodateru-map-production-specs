"""Regression tests for production Task worktree preparation."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import task_worktree as worktree


class WorktreePreparation(unittest.TestCase):
    def test_trust_destination_creates_missing_parent_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            destination=root/'missing'/'owner-issue'
            shown=type('Result',(),{'returncode':0,'stdout':b'[tools]\n','stderr':b''})()
            with patch.object(worktree.subprocess,'run',return_value=shown), \
                 patch.object(worktree.shutil,'which',return_value='/usr/bin/mise'), \
                 patch.object(worktree,'run_checked') as trusted:
                worktree.trust_destination(root,destination,'a'*40)
            trusted.assert_called_once_with(['/usr/bin/mise','trust',str(destination/'mise.toml')],root)
            self.assertFalse(destination.exists())
            self.assertTrue(destination.parent.is_dir())

    def test_started_claim_uses_production_guard(self):
        source=Path(worktree.__file__).read_text(encoding='utf-8')
        self.assertIn('import production_guard',source)
        self.assertNotIn('import rehearsal_guard',source)


if __name__=='__main__':
    unittest.main()
