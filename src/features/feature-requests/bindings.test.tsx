// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ApiError, type FeatureRequest } from "../../../packages/api-client/index";
import { RequestApiScreen } from "./bindings";
import { ScreenStateContext } from "../../app/useScreenState";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../app/api", () => ({ api: { request } }));
vi.mock("../../app/session", () => ({ useSession: () => ({ session: { person: { id: "self" } } }) }));
let root: Root, host: HTMLDivElement;
const navigate = vi.fn();
const item: FeatureRequest = { id: "post", personId: "self", version: 1, createdAt: 1, updatedAt: 1, title: "before", body: "before", visibility: "private", displayName: "自分", regionTags: [], purposeTags: [], empathyCount: 0, myEmpathy: false };
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  request.mockReset(); navigate.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render(params: Record<string, string> = {}) {
  await act(async () => root.render(<ScreenStateContext.Provider value={new Map()}><RequestApiScreen route={{ pageId: "feature-request-edit", params }} scopeKey="live:self" active navigate={navigate} back={vi.fn()}/></ScreenStateContext.Provider>));
}
async function input(text: string) {
  await act(async () => {
    const area = host.querySelector("textarea")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(area, text);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function save() { await act(async () => host.querySelector<HTMLButtonElement>(".request-editor-actions button")!.click()); }
it("lost create response retries the same ID, body and key and re-reads before navigation", async () => {
  let attempt = 0, committed: FeatureRequest | undefined;
  request.mockImplementation(async (op, data) => {
    if (op === "getMe") return { data: { id: "self", name: "自分" } };
    if (op === "postFeatureRequests") {
      attempt++;
      if (attempt === 1) throw new TypeError("network lost");
      committed = { ...item, id: data.body.id, body: data.body.body };
      return { data: committed };
    }
    if (op === "getFeatureRequestsRequestId") {
      if (!committed) throw new ApiError(404, "NOT_FOUND", "missing", "trace");
      return { data: committed };
    }
    throw new Error(op);
  });
  await render(); await input("new request");
  await act(async () => {
    const tags = host.querySelector<HTMLInputElement>('input[name="regionTags"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(tags, "本山, 東山公園");
    tags.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await save();
  expect(navigate).not.toHaveBeenCalled();
  expect(host.querySelector("textarea")!.disabled).toBe(true);
  await save();
  const calls = request.mock.calls.filter(([op]) => op === "postFeatureRequests");
  expect(calls).toHaveLength(2);
  expect(calls[1]![1].body).toEqual(calls[0]![1].body);
  expect(calls[0]![1].body.regionTags).toEqual(["本山", "東山公園"]);
  expect(calls[1]![1].idempotencyKey).toBe(calls[0]![1].idempotencyKey);
  expect(navigate).toHaveBeenCalledWith("feature-requests", { tab: "drafts", saved: "1" });
});
it("version conflict re-reads server state while retaining input for an explicit second save", async () => {
  let reads = 0, writes = 0;
  request.mockImplementation(async (op) => {
    if (op === "getMe") return { data: { id: "self", name: "自分" } };
    if (op === "getFeatureRequestsRequestId") return { data: ++reads === 1 ? item : { ...item, version: 2, body: "another editor" } };
    if (op === "patchFeatureRequestsRequestId") { writes++; throw new ApiError(409, "VERSION_CONFLICT", "conflict", "trace"); }
    throw new Error(op);
  });
  await render({ requestId: "post" }); await input("my retained draft"); await save();
  expect(writes).toBe(1); expect(navigate).not.toHaveBeenCalled();
  expect(host.querySelector("textarea")!.value).toBe("my retained draft");
  expect(host.textContent).toContain("another editor");
  expect(host.querySelector("textarea")!.disabled).toBe(false);
  await save();
  expect(request.mock.calls.filter(([op]) => op === "patchFeatureRequestsRequestId")[1]![1].version).toBe(2);
});
it("opening an editor and cancelling never writes to the API", async () => {
  request.mockImplementation(async op => op === "getMe" ? { data: { id: "self", name: "自分" } } : { data: item });
  await render({ requestId: "post" }); await input("not saved");
  expect(request.mock.calls.map(([op]) => op)).toEqual(["getMe", "getFeatureRequestsRequestId"]);
  expect(navigate).not.toHaveBeenCalled();
});
