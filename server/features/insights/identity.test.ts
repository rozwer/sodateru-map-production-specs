import { test } from "node:test";
import assert from "node:assert/strict";
import { inputKey, normalizeRefs } from "./identity.ts";

test("同じ条件と参照集合は順序に依存せず同じキー、版・期間変更は別キー", () => {
  const a = { personId: "p", kind: "comparison", conditions: { left: "r1", right: "r2" }, sourceRefs: [{ type: "record" as const, id: "r2", version: 1 }, { type: "record" as const, id: "r1", version: 1 }], timeZone: "Asia/Tokyo", generatorVersion: "comparison-v1", model: null };
  assert.equal(inputKey(a), inputKey({ ...a, conditions: { right: "r2", left: "r1" }, sourceRefs: [...a.sourceRefs].reverse() }));
  assert.notEqual(inputKey(a), inputKey({ ...a, sourceRefs: [{ type: "record" as const, id: "r1", version: 2 }] }));
  assert.notEqual(inputKey(a), inputKey({ ...a, conditions: { left: "r2", right: "r1" } }));
  assert.notEqual(inputKey(a), inputKey({ ...a, personId: "other" }));
});
test("同一参照の重複は統合し、相反する版は拒否する", () => {
  assert.deepEqual(normalizeRefs([{ type: "record" as const, id: "r", version: 1 }, { type: "record" as const, id: "r", version: 1 }]), [{ type: "record" as const, id: "r", version: 1 }]);
  assert.throws(() => normalizeRefs([{ type: "record" as const, id: "r", version: 1 }, { type: "record" as const, id: "r", version: 2 }]));
});
