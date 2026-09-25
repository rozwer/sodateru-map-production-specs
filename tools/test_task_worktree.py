import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import task_worktree as worktree
import taskctl


class InlineWorktreeStartTest(unittest.TestCase):
    def test_claim_passes_json_to_atomic_board_command_without_definition_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            definition = json.dumps({"id": "EXAMPLE", "issue_number": 304})
            with patch.object(worktree.subprocess, "run",
                              return_value=SimpleNamespace(returncode=2, stderr="claim stopped")) as run:
                with self.assertRaisesRegex(taskctl.BoardError, "claim stopped"):
                    worktree.create_worktree(root, "EXAMPLE", root / "new-worktree",
                                             "mattsun/304-example", "mattsun",
                                             definition_json=definition)
            command = run.call_args.args[0]
            self.assertIn("--definition-json", command)
            self.assertEqual(command[command.index("--definition-json") + 1], definition)
            self.assertNotIn("--definition", command)
            self.assertFalse((root / ".local/claims/EXAMPLE.definition.json").exists())


if __name__ == "__main__":
    unittest.main()
