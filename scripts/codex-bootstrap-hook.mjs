import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const dependencyNames = ["smol-toml", "shell-quote"];

export function isExactBootstrap(event) {
  if (event?.hook_event_name !== "PreToolUse" ||
      !["Bash", "exec_command"].includes(event.tool_name)) return false;
  const input = event.tool_input ?? {};
  if ((input.command ?? input.cmd) !== "mise exec -- bun install --frozen-lockfile") return false;
  if (typeof event.cwd !== "string") return false;
  const cwd = resolve(event.cwd, input.workdir ?? input.cwd ?? ".");
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

export async function handle(event, role) {
  if (!["mise", "task"].includes(role)) throw new Error("Unknown hook role");
  try {
    const module = await import(role === "mise" ? "./codex-mise-hook.mjs" : "./codex-task-hook.mjs");
    return module.handle(event);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" ||
        !dependencyNames.some(name => error.message?.includes("'" + name + "'"))) throw error;
    if (isExactBootstrap(event)) return null;
    if (role === "mise" && event?.hook_event_name === "SessionStart") {
      return { hookSpecificOutput: { hookEventName: "SessionStart",
        additionalContext: "このworktreeの依存を導入してください: mise exec -- bun install --frozen-lockfile" } };
    }
    throw new Error("Hook依存が未導入です。正規setup: mise exec -- bun install --frozen-lockfile");
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const event = JSON.parse(readFileSync(0, "utf8"));
    const result = await handle(event, process.argv[2]);
    if (result) console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
