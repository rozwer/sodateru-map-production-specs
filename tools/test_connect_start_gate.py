import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import connect_start_gate as gate
import taskctl


class ConnectHandoffGateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "Test")
        self.evidence = "docs/evidence/UI-MAP/operation.md"
        self.contract_path = "docs/01_requirements/04_api/openapi.json"
        self.interactions = "docs/01_requirements/03_pages/map/interactions.json"
        self.handoff_path = "docs/evidence/UI-MAP/connect-handoff.json"
        self.contract = json.dumps({"paths": {"/places": {"get": {"operationId": "getPlaceCandidates"}}}}) + "\n"
        self.write(self.evidence, "Map search selection works in the UI.\n")
        self.write(self.contract_path, self.contract)
        self.write(self.interactions, json.dumps([{"id": "map--search", "api": ["getPlaceCandidates"]}]))
        self.commit()
        self.proof = self.git("rev-parse", "HEAD")
        self.task = {
            "id": "CONNECT-MAP", "title": "Connect map", "priority": "P1", "kind": "ui",
            "write_paths": ["src/features/map/search.ts", "src/features/map/other.ts",
                            "docs/evidence/CONNECT-MAP/"],
            "start_gate": {"source_ui_task": "UI-MAP", "handoff_path": self.handoff_path},
            "hard_dependencies": [],
        }
        self.graph = {"tasks": [self.task, {"id": "UI-MAP", "title": "Map", "priority": "P1", "kind": "ui", "pages": ["map"], "write_paths": [], "hard_dependencies": []}]}

    def git(self, *args, check=True):
        result = subprocess.run(["git", *args], cwd=self.root, text=True,
                                capture_output=True)
        if check and result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)

    def commit(self):
        self.git("add", ".")
        self.git("commit", "-qm", "fixture")

    def handoff(self, **overrides):
        unit = {
            "id": "map-search",
            "page": "map",
            "action": "map--search",
            "write_paths": ["src/features/map/search.ts"],
            "ui_commit": self.proof,
            "ui_evidence": self.evidence,
            "contract_commit": self.proof,
            "contract_path": self.contract_path,
            "contract_sha256": hashlib.sha256(self.contract.encode()).hexdigest(),
            "api_operation_ids": ["getPlaceCandidates"],
        }
        unit.update(overrides)
        self.write(self.handoff_path, json.dumps({
            "source_ui_task": "UI-MAP", "connection_task": "CONNECT-MAP",
            "units": [unit],
        }))
        self.commit()
        return self.git("rev-parse", "HEAD")

    def test_missing_handoff_stays_blocked(self):
        units, errors = gate.ready_units(self.task, self.graph, self.proof, self.git)
        self.assertEqual(units, [])
        self.assertIn("handoff-missing:" + self.handoff_path, errors)

    def test_integrated_unit_claims_only_listed_feature_path(self):
        base = self.handoff()
        units, errors = gate.ready_units(self.task, self.graph, base, self.git)
        self.assertEqual(errors, [])
        self.assertEqual(units[0]["paths"], [
            "src/features/map/search.ts", "docs/evidence/CONNECT-MAP/",
        ])
        board = {"graph": self.graph, "tasks": {
            "CONNECT-MAP": {"status": "backlog", "paths": []},
            "UI-MAP": {"status": "backlog", "paths": []},
        }}
        with patch.object(taskctl.cg, 'ready_units', return_value=(units, [])):
            ready = taskctl.ready_rows(board, base)
        self.assertTrue(next(row for row in ready if row["id"] == "CONNECT-MAP")["can_claim"])
        self.assertEqual(next(row for row in ready if row["id"] == "CONNECT-MAP")["write_paths"],
                         units[0]["paths"])

    def test_claim_uses_verified_unit_paths_even_with_wider_task_definition(self):
        base = self.handoff()
        units, errors = gate.ready_units(self.task, self.graph, base, self.git)
        self.assertEqual(errors, [])
        graph = dict(self.graph, task_policy={
            "integration_branch": "develop",
            "issue_numbers": {"CONNECT-MAP": 134, "UI-MAP": 8},
        })
        board = {"graph": graph, "revision": 4, "tasks": {
            "CONNECT-MAP": {"status": "backlog", "paths": [], "generation": 0},
            "UI-MAP": {"status": "backlog", "paths": [], "generation": 0},
        }}
        args = argparse.Namespace(command="claim", task="CONNECT-MAP", actor="rozwer",
                                  remote="origin", path=[], unit="map-search")
        with patch.object(taskctl.op, "owner_at", return_value="rozwer"), \
             patch.object(taskctl.op, "verify_issue"), \
             patch.object(taskctl, "integration_base", return_value=base), \
             patch.object(taskctl.cg, "ready_units", return_value=(units, [])):
            state = taskctl.change(board, args)
        self.assertEqual(state["paths"], units[0]["paths"])
        self.assertNotIn("src/features/map/other.ts", state["paths"])
        self.assertEqual(state["claim_unit"], "map-search")

    def test_wrong_contract_or_unprovided_action_is_rejected(self):
        for change in ({"contract_sha256": "0" * 64},
                       {"action": "missing"},
                       {"write_paths": ["src/features/map/other.ts", "server/db/"]},
                       {"ui_commit": "0" * 40}):
            base = self.handoff(**change)
            units, errors = gate.ready_units(self.task, self.graph, base, self.git)
            self.assertEqual(units, [])
            self.assertTrue(errors)

    def test_handoff_on_unmerged_commit_is_not_ready(self):
        base = self.handoff()
        main_branch = self.git("branch", "--show-current")
        self.git("checkout", "-qb", "unmerged", self.proof)
        self.write("extra.txt", "other branch")
        self.commit()
        other = self.git("rev-parse", "HEAD")
        self.git("checkout", "-q", main_branch)
        # A claimed unit cannot cite a UI change that has not reached the base.
        data = json.loads((self.root / self.handoff_path).read_text())
        data["units"][0]["ui_commit"] = other
        self.write(self.handoff_path, json.dumps(data))
        self.commit()
        units, errors = gate.ready_units(self.task, self.graph, self.git("rev-parse", "HEAD"), self.git)
        self.assertEqual(units, [])
        self.assertIn("handoff-unit-ui-proof:map-search", errors)


if __name__ == "__main__":
    unittest.main()
