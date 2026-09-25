"""Read-only validation of a CONNECT operation handoff at an integration commit."""
import hashlib
import json
import re
import subprocess

HEX = re.compile(r"^[0-9a-f]{40}$")


def _show(git, commit, path):
    if not isinstance(path, str) or not path or path.startswith("/") or ".." in path.split("/"):
        return None
    root = git("rev-parse", "--show-toplevel")
    result = subprocess.run(["git", "-C", root, "show", f"{commit}:{path}"], capture_output=True)
    return result.stdout if result.returncode == 0 else None


def _ancestor(commit, base, git):
    return (isinstance(commit, str) and bool(HEX.fullmatch(commit)) and
            git("merge-base", commit, base, check=False) == commit)


def ready_units(task, graph, base, git):
    """Return valid operation scopes and reasons. No remote or board writes."""
    gate = task.get("start_gate")
    if not gate:
        return [], []
    by = {item["id"]: item for item in graph["tasks"]}
    source = by.get(gate.get("source_ui_task"))
    path = gate.get("handoff_path")
    if not source or not isinstance(path, str) or path != f"docs/evidence/{source['id']}/connect-handoff.json":
        return [], ["handoff-definition"]
    raw = _show(git, base, path)
    if raw is None:
        return [], ["handoff-missing:" + path]
    try:
        handoff = json.loads(raw)
    except (ValueError, TypeError):
        return [], ["handoff-invalid-json:" + path]
    if (handoff.get("source_ui_task") != source["id"] or
            handoff.get("connection_task") != task["id"] or
            not isinstance(handoff.get("units"), list)):
        return [], ["handoff-identity:" + path]
    result, errors = [], []
    planned = set(task["write_paths"])
    for unit in handoff["units"]:
        if not isinstance(unit, dict):
            errors.append("handoff-unit-invalid")
            continue
        key = unit.get("id")
        page = unit.get("page")
        action = unit.get("action")
        paths = unit.get("write_paths")
        ui_commit = unit.get("ui_commit")
        contract_commit = unit.get("contract_commit")
        ui_evidence = unit.get("ui_evidence")
        contract_path = unit.get("contract_path")
        digest = unit.get("contract_sha256")
        api_ids = unit.get("api_operation_ids")
        if (not isinstance(key, str) or not key or
                page not in source.get("pages", []) or not isinstance(action, str) or
                not isinstance(paths, list) or not paths or
                any(not isinstance(p, str) or p not in planned for p in paths) or
                not any(not p.startswith("docs/") for p in paths) or
                not isinstance(api_ids, list) or
                any(not isinstance(x, str) or not x for x in api_ids)):
            errors.append("handoff-unit-scope:" + str(key))
            continue
        if (not _ancestor(ui_commit, base, git) or not _ancestor(contract_commit, base, git) or
                not isinstance(ui_evidence, str) or
                not ui_evidence.startswith(f"docs/evidence/{source['id']}/") or
                not _show(git, ui_commit, ui_evidence) or
                _show(git, ui_commit, ui_evidence) != _show(git, base, ui_evidence)):
            errors.append("handoff-unit-ui-proof:" + key)
            continue
        if (contract_path != "docs/01_requirements/04_api/openapi.json" or
                not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest)):
            errors.append("handoff-unit-contract:" + key)
            continue
        contract = _show(git, contract_commit, contract_path)
        current = _show(git, base, contract_path)
        if (contract is None or current is None or
                hashlib.sha256(current).hexdigest() != digest or contract != current):
            errors.append("handoff-unit-contract-version:" + key)
            continue
        interactions = _show(git, base, f"docs/01_requirements/03_pages/{page}/interactions.json")
        if interactions is None:
            errors.append("handoff-unit-page:" + key)
            continue
        try:
            target = next((x for x in json.loads(interactions) if x.get("id") == action), None)
            operations = {method["operationId"] for methods in json.loads(current)["paths"].values()
                          for method in methods.values() if isinstance(method, dict) and "operationId" in method}
        except (ValueError, KeyError, TypeError):
            errors.append("handoff-unit-contract-invalid:" + key)
            continue
        if (not target or not set(api_ids) <= set(target.get("api", [])) or
                not set(api_ids) <= operations or
                (task["id"] != "CONNECT-BASE" and not api_ids)):
            errors.append("handoff-unit-action-api:" + key)
            continue
        result.append({"id": key, "paths": list(dict.fromkeys(paths + [
            f"docs/evidence/{task['id']}/"
        ])), "page": page, "action": action})
    if not result and not errors:
        errors.append("handoff-no-units:" + path)
    return result, errors
