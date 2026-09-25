import copy
import json
from pathlib import Path
import unittest

import sync_graph


ROOT = Path(__file__).resolve().parents[1]
CURRENT = json.loads((ROOT / "TASK_GRAPH.json").read_text())


def pre_301_board():
    published = copy.deepcopy(CURRENT)
    tasks = {t["id"]: t for t in published["tasks"]}
    new_ids = {"UI-BASE-LAYOUT", "UI-MAP-CARD", "UI-MAP-RECORD-LINK",
               "UI-MAP-THEME-RETRY"}
    inline_ids = {"GROW-UI", "DISASTER-UI", "DISASTER-UI-SCREEN",
                  "BUILDING-GROWTH"}
    published["tasks"] = [t for t in published["tasks"] if t["id"] not in new_ids | inline_ids]
    for tid in new_ids | inline_ids:
        published["task_policy"]["issue_numbers"].pop(tid)
    published["supersessions"].pop("VISUAL-PLUGINS")
    published["supersessions"].pop("DISASTER-UI")
    published["supersession_details"].pop("VISUAL-PLUGINS")
    published["supersession_details"].pop("DISASTER-UI")
    published["ui_connection_split"].pop("connection_start_policy")
    for task in published["tasks"]:
        tid = task["id"]
        if tid.startswith("CONNECT-") and tid != "CONNECT-HEALTH":
            task["hard_dependencies"] = [task["completion_scope"]["source_ui_task"]]
            task.pop("start_gate")
        if tid in ("UI-HEALTH", "CONNECT-HEALTH", "HEALTH"):
            task["scope_schedule"]["mode"] = "if-time-remains"
    states = {t["id"]: {"status": "backlog", "paths": [], "token": None}
              for t in published["tasks"]}
    for source, successor in (("VISUAL-COMMUNITY", ["VISUAL-SOCIAL", "VISUAL-PLUGINS"]),
                              ("VISUAL-SELF", ["VISUAL-SELF-CONTINUE", "VISUAL-RECORDS-CAMERA"])):
        states[source].update(status="superseded", superseded_by=successor)
    for tid in inline_ids:
        definition = copy.deepcopy(tasks[tid])
        definition.pop("source_task_ids", None)
        published["tasks"].append(definition)
        published["task_policy"]["issue_numbers"][tid] = CURRENT["task_policy"]["issue_numbers"][tid]
        states[tid] = {"status": "backlog", "paths": [], "token": None}
    active = {"id": "FE-TASK-ALIGNMENT", "kind": "coordination", "priority": "P0",
              "title": "Task alignment", "write_paths": ["TASK_GRAPH.json"],
              "hard_dependencies": [], "connect_after": []}
    published["tasks"].append(active)
    published["task_policy"]["issue_numbers"][active["id"]] = 301
    states[active["id"]] = {"status": "claimed", "paths": ["TASK_GRAPH.json"],
                            "token": "existing-token", "base_commit": "original-base",
                            "owner": "mattsun"}
    return {"graph": published, "tasks": states, "inline_tasks": sorted(inline_ids | {active["id"]}),
            "revision": 312}


class AlignmentMigrationTest(unittest.TestCase):
    def test_retirement_preserves_live_claim_and_never_marks_old_done(self):
        before = pre_301_board()
        active = copy.deepcopy(before["tasks"]["FE-TASK-ALIGNMENT"])
        after = sync_graph.migrate(before, CURRENT)
        self.assertEqual(after["tasks"]["FE-TASK-ALIGNMENT"], active)
        self.assertEqual(after["tasks"]["VISUAL-PLUGINS"]["status"], "superseded")
        self.assertEqual(after["tasks"]["VISUAL-PLUGINS"]["superseded_by"], "GROW-UI")
        self.assertEqual(after["tasks"]["DISASTER-UI"]["status"], "superseded")
        self.assertEqual(after["tasks"]["DISASTER-UI"]["superseded_by"],
                         ["DISASTER-UI-SCREEN", "BUILDING-GROWTH"])
        for task in ("GROW-UI", "DISASTER-UI-SCREEN", "BUILDING-GROWTH"):
            self.assertEqual(after["tasks"][task]["status"], "backlog")
        for task in ("UI-BASE-LAYOUT", "UI-MAP-CARD", "UI-MAP-RECORD-LINK",
                     "UI-MAP-THEME-RETRY"):
            self.assertEqual(after["tasks"][task]["status"], "backlog")

    def test_claimed_old_task_cannot_be_retired(self):
        before = pre_301_board()
        before["tasks"]["DISASTER-UI"].update(status="claimed", token="other", paths=["src/map/"])
        with self.assertRaisesRegex(Exception, "Only unclaimed backlog"):
            sync_graph.migrate(before, CURRENT)

    def test_missing_handoff_policy_or_original_successor_is_rejected(self):
        changed = copy.deepcopy(CURRENT)
        changed["ui_connection_split"]["connection_start_policy"]["handoffs"].pop("CONNECT-MAP")
        with self.assertRaisesRegex(Exception, "handoff mapping incomplete"):
            sync_graph.validate(changed)
        changed = copy.deepcopy(CURRENT)
        changed["supersessions"]["VISUAL-COMMUNITY"] = ["VISUAL-SOCIAL", "GROW-UI"]
        with self.assertRaisesRegex(Exception, "[Ss]uccessor"):
            sync_graph.migrate(pre_301_board(), changed)


if __name__ == "__main__":
    unittest.main()
