import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
export const dependencyNames = ["smol-toml", "shell-quote"];
const dependencyRequire = createRequire(import.meta.url);

export function missingHookDependencies() {
  return dependencyNames.some(name => {
    try { dependencyRequire.resolve(name); return false; }
    catch (error) {
      if (error?.code === "MODULE_NOT_FOUND") return true;
      throw error;
    }
  });
}

export function toolCwd(event) {
  const input = event?.tool_input ?? {};
  const workdir = input.workdir ?? input.cwd;
  if (typeof workdir === "string" && isAbsolute(workdir)) return resolve(workdir);
  if (typeof event?.cwd === "string" && isAbsolute(event.cwd) &&
      (workdir === undefined || typeof workdir === "string"))
    return resolve(event.cwd, workdir ?? ".");
  return null;
}

export function isExactBootstrap(event) {
  if (event?.hook_event_name !== "PreToolUse" ||
      !["Bash", "exec_command"].includes(event.tool_name)) return false;
  const input = event.tool_input ?? {};
  if ((input.command ?? input.cmd) !== "mise exec -- bun install --frozen-lockfile") return false;
  const cwd = toolCwd(event);
  if (!cwd) return false;
  try {
    const target = realpathSync(execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"],
      { encoding: "utf8" }).trim());
    const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    return target === root &&
      /^bun@/.test(manifest.packageManager) &&
      readFileSync(resolve(root, "mise.toml"), "utf8").includes('codex_package_manager = "bun"');
  } catch {
    return false;
  }
}

export function normalizedEvent(event) {
  const cwd = toolCwd(event);
  const input = event?.tool_input;
  return cwd ? {
    ...event, cwd,
    tool_input: input && typeof input === "object" && !Array.isArray(input)
      ? { ...input, workdir: cwd } : input,
  } : event;
}

export function missingDependencyResult(event, role) {
  if (isExactBootstrap(event)) return null;
  if (role === "mise" && event?.hook_event_name === "SessionStart") {
    return { hookSpecificOutput: { hookEventName: "SessionStart",
      additionalContext: "このworktreeの依存を導入してください: mise exec -- bun install --frozen-lockfile" } };
  }
  throw new Error("Hook依存が未導入です。正規setup: mise exec -- bun install --frozen-lockfile");
}
