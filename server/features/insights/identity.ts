import { createHash } from "node:crypto";

export type SourceRef = { type: "record" | "visit" | "place" | "checkin" | "route"; id: string; version: number };

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("Non-finite identity value");
    const result = JSON.stringify(value);
    if (result === undefined) throw new TypeError("Undefined identity value");
    return result;
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalJson((value as Record<string, unknown>)[key])).join(",") + "}";
}

export function normalizeRefs(refs: readonly SourceRef[]): SourceRef[] {
  const unique = new Map<string, SourceRef>();
  for (const ref of refs) {
    if (!["record", "visit", "place", "checkin", "route"].includes(ref.type) || !ref.id || !Number.isSafeInteger(ref.version) || ref.version < 1) throw new TypeError("Invalid source reference");
    const key = ref.type + ":" + ref.id;
    const old = unique.get(key);
    if (old && old.version !== ref.version) throw new TypeError("Conflicting source versions");
    unique.set(key, { type: ref.type, id: ref.id, version: ref.version });
  }
  return [...unique.values()].sort((a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function inputKey(input: { personId: string; kind: string; conditions: unknown; sourceRefs: readonly SourceRef[]; timeZone: string; generatorVersion: string; model: string | null }): string {
  return createHash("sha256").update(canonicalJson({ ...input, sourceRefs: normalizeRefs(input.sourceRefs) })).digest("hex");
}
