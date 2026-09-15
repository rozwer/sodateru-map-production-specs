import { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../../src/app/App";
import { api } from "../../../src/app/api";
import { screens } from "../../../src/features/friends/screens";
import type { Person } from "../../../packages/api-client";
function Preview() {
  const [person, setPerson] = useState<Person | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(profileKey: string) {
    setBusy(true);
    setPerson(null);
    setError("");
    try {
      api.setDataMode("live");
      await api.request("postSession", {
        body: { profileKey },
        idempotencyKey: crypto.randomUUID(),
      });
      setPerson((await api.request("getMe", {})).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "本人開始失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 3000,
          padding: 4,
          background: "#fff1cc",
          fontSize: 11,
          maxWidth: 240,
        }}
      >
        実API・専用検証DB
        <br />
        <button disabled={busy} onClick={() => void login("alice")}>
          あかり本人
        </button>
        <button disabled={busy} onClick={() => void login("bob")}>
          ひなた本人
        </button>
        {person?.name}
        {error}
      </div>
      {person && (
        <App
          screens={screens}
          scopeKey={`${person.id}:live`}
          dataMode="live"
          profile={person}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
