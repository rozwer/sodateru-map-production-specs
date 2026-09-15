import { createApiClient } from "../../../packages/api-client/index.ts";
export async function demoClient() {
  let cookie = "";
  const api = createApiClient({ baseUrl: "http://127.0.0.1:3002/api/v1", fetch: async (url, options) => {
    const headers = new Headers(options.headers);
    if (headers.get("X-Data-Mode") !== "demo") throw new Error("This scenario may write only to demo.");
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(url, { ...options, headers });
    if (response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(item => item.split(";")[0]).join("; ");
    return response;
  } });
  api.setDataMode("demo");
  const profiles = await api.request("getSessionProfiles", {});
  if (!profiles.items.some(item => item.profileKey === "self")) throw new Error("demo/self is missing");
  await api.request("postSession", { body: { profileKey: "self" }, idempotencyKey: crypto.randomUUID() });
  const { data: session } = await api.request("getSession", {});
  if (session.dataMode !== "demo") throw new Error("Unexpected mode");
  console.log("confirmed demo/self session", JSON.stringify({personId:session.person.id,name:session.person.name,mode:session.dataMode}));
  return { api, session };
}
