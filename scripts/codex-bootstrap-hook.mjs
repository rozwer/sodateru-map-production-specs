import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dependencyNames, missingHookDependencies, missingDependencyResult,
  normalizedEvent } from "./codex-hook-bootstrap-core.mjs";

export { isExactBootstrap, toolCwd } from "./codex-hook-bootstrap-core.mjs";

export async function handle(event, role) {
  if (!["mise", "task"].includes(role)) throw new Error("Unknown hook role");
  if (missingHookDependencies()) return missingDependencyResult(event, role);
  try {
    const module = await import(role === "mise" ? "./codex-mise-hook.mjs" : "./codex-task-hook.mjs");
    return module.handle(normalizedEvent(event));
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" ||
        !dependencyNames.some(name => error.message?.includes("'" + name + "'"))) throw error;
    return missingDependencyResult(event, role);
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
