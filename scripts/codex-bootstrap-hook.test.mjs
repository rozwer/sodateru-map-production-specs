import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = fileURLToPath(new URL("../", import.meta.url));

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "codex-bootstrap-"));
  try {
    mkdirSync(join(root, "scripts"));
    for (const name of ["codex-bootstrap-hook.mjs", "codex-mise-hook.mjs", "codex-task-hook.mjs"])
      copyFileSync(join(source, "scripts", name), join(root, "scripts", name));
    copyFileSync(join(source, "package.json"), join(root, "package.json"));
    copyFileSync(join(source, "mise.toml"), join(root, "mise.toml"));
    assert.equal(spawnSync("git", ["init", "-q"], { cwd: root }).status, 0);
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function invoke(root, role, event) {
  return spawnSync(process.execPath, [join(root, "scripts/codex-bootstrap-hook.mjs"), role],
    { cwd: root, input: JSON.stringify(event), encoding: "utf8" });
}

const command = "mise exec -- bun install --frozen-lockfile";
for (const role of ["mise", "task"]) {
  test(role + " permits only the exact dependency bootstrap command before install", () => fixture(root => {
    const event = { hook_event_name: "PreToolUse", tool_name: "exec_command", cwd: root,
      tool_input: { cmd: command } };
    assert.equal(invoke(root, role, event).status, 0);
    for (const cmd of ["npm install", command + " && npm install",
                       "mise exec -- bun install", command + "; git push",
                       "mise exec -- bun install --frozen-lockfile --ignore-scripts"]) {
      const denied = invoke(root, role, { ...event, tool_input: { cmd } });
      assert.equal(denied.status, 2, cmd);
      assert.match(denied.stderr, /Hook依存が未導入/);
    }
    assert.equal(invoke(root, role, { ...event, tool_name: "apply_patch" }).status, 2);
  }));
}

test("SessionStart gives the setup command without dependencies", () => fixture(root => {
  const result = invoke(root, "mise", { hook_event_name: "SessionStart", cwd: root, session_id: "test" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mise exec -- bun install --frozen-lockfile/);
}));

test("an unrelated checkout cannot use this bootstrap", () => fixture(root => {
  const other = mkdtempSync(join(tmpdir(), "other-checkout-"));
  try {
    assert.equal(spawnSync("git", ["init", "-q"], { cwd: other }).status, 0);
    const result = invoke(root, "task", { hook_event_name: "PreToolUse",
      tool_name: "exec_command", cwd: other, tool_input: { cmd: command } });
    assert.equal(result.status, 2);
    const overridden = invoke(root, "task", { hook_event_name: "PreToolUse",
      tool_name: "exec_command", cwd: root, tool_input: {
        cmd: command, workdir: other } });
    assert.equal(overridden.status, 2);
  } finally { rmSync(other, { recursive: true, force: true }); }
}));

test("Codex exec_command payload uses absolute tool workdir when event cwd is absent", () => fixture(root => {
  for (const role of ["mise", "task"]) {
    const event = { hook_event_name: "PreToolUse", tool_name: "exec_command",
      tool_input: { cmd: command, workdir: root } };
    assert.equal(invoke(root, role, event).status, 0);
    assert.equal(invoke(root, role, { ...event, cwd: tmpdir() }).status, 0);
    assert.equal(invoke(root, role, { ...event, tool_input: {
      cmd: command, cwd: root } }).status, 0);
    const relative = invoke(root, role, { ...event, tool_input: {
      cmd: command, workdir: "." } });
    assert.equal(relative.status, 2);
    assert.match(relative.stderr, /Hook依存が未導入/);
  }
}));

test("Codex Bash payload accepts command and absolute cwd field", () => fixture(root => {
  const event = { hook_event_name: "PreToolUse", tool_name: "Bash",
    tool_input: { command, cwd: root } };
  assert.equal(invoke(root, "task", event).status, 0);
  const denied = invoke(root, "task", { ...event, tool_input: {
    command: "mise run task:ready", cwd: root } });
  assert.equal(denied.status, 2);
}));
