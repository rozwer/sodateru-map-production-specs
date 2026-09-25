import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import taskctl


class InlineClaimDefinitionTest(unittest.TestCase):
    def test_json_argument_needs_no_preclaim_file(self):
        definition = {"id": "EXAMPLE", "issue_number": 304, "write_paths": ["scripts/example.mjs"]}
        self.assertEqual(taskctl.load_claim_definition(value=json.dumps(definition)), definition)

    def test_file_and_inline_modes_are_exclusive(self):
        with self.assertRaisesRegex(taskctl.BoardError, "either"):
            taskctl.load_claim_definition("definition.json", "{}")

    def test_invalid_or_non_object_json_rejected(self):
        for raw in ("", "[]", "{broken"):
            with self.subTest(raw=raw), self.assertRaises(taskctl.BoardError):
                taskctl.load_claim_definition(value=raw)

    def test_inline_definition_uses_existing_board_registration(self):
        board = {"graph": {"tasks": [], "task_policy": {"issue_numbers": {}}},
                 "tasks": {}, "inline_tasks": []}
        definition = {"id": "EXAMPLE", "issue_number": 304, "title": "Example",
                      "kind": "coordination", "priority": "P0", "lane": "A",
                      "owner": "mattsun", "write_paths": ["scripts/example.mjs"],
                      "hard_dependencies": [], "connect_after": []}
        with patch("sync_graph.validate"):
            taskctl.register_inline(board, "EXAMPLE",
                                    taskctl.load_claim_definition(value=json.dumps(definition)))
        self.assertEqual(board["graph"]["task_policy"]["issue_numbers"]["EXAMPLE"], 304)
        self.assertEqual(board["tasks"]["EXAMPLE"]["status"], "backlog")
        self.assertEqual(board["inline_tasks"], ["EXAMPLE"])

    def test_existing_file_mode_remains_available(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "definition.json"
            path.write_text('{"id":"EXAMPLE"}')
            self.assertEqual(taskctl.load_claim_definition(path=path), {"id": "EXAMPLE"})


if __name__ == "__main__":
    unittest.main()
