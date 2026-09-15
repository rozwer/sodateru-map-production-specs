import { serve } from "@hono/node-server";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createApp } from "../../../server/app/app.ts";
import { openDatabases } from "../../../server/db/connection.ts";
import {
  loadLocalIdentity,
  seedProfiles,
} from "../../../server/core/session.ts";
import records from "../../../server/features/records/register.ts";
import settings from "../../../server/features/settings/register.ts";
import information from "../../../server/information/register.ts";
import friends from "../../../server/features/friends/register.ts";
import community from "../../../server/features/community/register.ts";
import routes from "../../../server/features/routes/register.ts";
import themes from "../../../server/features/themes/register.ts";
import places from "../../../server/features/places/register.ts";
const directory =
  "/Users/roz/.codex/worktrees/ui-friends-14/.local/live-acceptance";
mkdirSync(directory, { recursive: true });
if (!existsSync(`${directory}/profiles.json`))
  writeFileSync(
    `${directory}/profiles.json`,
    JSON.stringify({
      version: 1,
      secret: randomBytes(32).toString("hex"),
      profiles: [
        { key: "alice", id: "friends-live-alice", name: "共有確認・あかり" },
        { key: "bob", id: "friends-live-bob", name: "共有確認・ひなた" },
      ],
    }),
    { mode: 0o600 },
  );
const features = [
  records,
  settings,
  information,
  friends,
  community,
  routes,
  themes,
  places,
];
const databases = openDatabases({
  livePath: `${directory}/live.sqlite`,
  demoPath: `${directory}/demo.sqlite`,
  migrations: features.flatMap((feature) => feature.migrations ?? []),
});
const identity = loadLocalIdentity(`${directory}/profiles.json`);
seedProfiles(databases, identity.profiles);
const app = createApp({ databases, identity, features });
const server = serve(
  { fetch: app.fetch, hostname: "127.0.0.1", port: 3114 },
  () => console.log("UI-FRIENDS actual API ready: http://127.0.0.1:3114"),
);
process.once("SIGINT", () =>
  server.close(() => {
    databases.close();
    process.exit(0);
  }),
);
