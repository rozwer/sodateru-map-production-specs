// Focused real registry/SQLite check. Observation below is a TEST FIXTURE; no provider calls.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabases } from "../../../server/db/connection.ts";
import { seedProfiles } from "../../../server/core/session.ts";
import { transaction } from "../../../server/db/migrate.ts";
import pluginsFeature from "../../../server/features/plugins/register.ts";
import placesFeature from "../../../server/features/places/register.ts";
import { PluginService, PluginStore, pluginRegistry } from "../../../server/features/plugins/index.ts";
import { placesService } from "../../../server/features/places/service.ts";
import { getPlace } from "../../../server/features/places/repository.ts";
import { bikeMigration } from "../../../server/plugins/bike/migration.ts";
import { bikeRelease, bikePlacesRelease } from "../../../server/plugins/bike/release.ts";
import { createBikeService } from "../../../server/plugins/bike/register.ts";
import { defaultSettings, settingsHash } from "../../../server/plugins/bike/domain.ts";
import type { SearchResult } from "../../../server/plugins/bike/service.ts";

const dir = mkdtempSync(join(tmpdir(), "bike-release-"));
const options = { livePath: join(dir,"live.sqlite"), demoPath: join(dir,"demo.sqlite"), migrations: [bikeMigration, ...(pluginsFeature.migrations ?? []), ...(placesFeature.migrations ?? [])] };
let databases = openDatabases(options);
const context = { personId: randomUUID(), dataMode: "live" as const, requestId: randomUUID(), signal: new AbortController().signal };
seedProfiles(databases, [{ id: context.personId, key: "test", name: "RELEASE TEST FIXTURE" }]);
const legacy = structuredClone(bikeRelease.manifest);
const capability = { targetKey: "feature:bike:place-candidates", property: "enabled", value: true };
const confirmation = (p: PluginService) => ({ confirmed: true as const, stateRevision: p.state().revision });
function currentSearch(p: PluginService): SearchResult {
  const item = p.store.get("bike"), now = Date.now();
  const source = { id: "fixture", name: "TEST FIXTURE", url: "https://www.openstreetmap.org/node/1", attribution: "TEST FIXTURE, not a live observation", fetchedAt: now, updatedAt: null };
  const result: SearchResult = { id: randomUUID(), kind: "search", dataKind: "real", installId: item.installId, settingsVersion: item.version,
    settingsHash: settingsHash(defaultSettings), settings: structuredClone(defaultSettings), fetchedAt: now, expiresAt: now + 900000,
    source, roads: [], places: [{ id: "osm:node:1", name: "TEST FIXTURE", category: "motorcycle_parking", position: { longitude: 139.701, latitude: 35.659 }, tags: {}, source,
      vehicleAssessment: { status: "unknown", reason: "TEST FIXTURE", sourceRefs: [source.id], checkedAt: now } }] };
  databases.live.prepare("INSERT INTO bike_results VALUES (?,?,?,?,?,?,?,?)").run(result.id, context.personId, "live", "search", item.installId, result.settingsHash, JSON.stringify(result), now);
  return result;
}
try {
  let plugins = new PluginService(new PluginStore(databases.live, context));
  assert.deepEqual(pluginRegistry.versions("bike").map(v => v.pluginVersion), ["1.0.0", "1.1.0"]);
  assert.equal(pluginRegistry.get("bike").manifest.pluginVersion, "1.1.0");
  const old = await plugins.install({ ...confirmation(plugins), id: "bike", pluginVersion: "1.0.0", enabled: true, settings: structuredClone(bikeRelease.manifest.defaultSettings) });
  assert.deepEqual(old.declarations, [{ targetKey: "layer:bike", property: "visibility", value: true }]);
  const originalSearch = currentSearch(plugins);
  assert.throws(() => createBikeService(databases.live).placeCandidates(context, originalSearch.id), { code: "STATE_CONFLICT" });
  const updated = await plugins.update("bike", old.version, { ...confirmation(plugins), pluginVersion: "1.1.0" });
  assert.deepEqual(updated.settings, old.settings);
  assert.deepEqual(updated.declarations, [...old.declarations, capability]);
  assert.deepEqual(bikeRelease.manifest, legacy);
  assert.notEqual(bikePlacesRelease.manifest.settingsSchema, bikeRelease.manifest.settingsSchema);
  const current = currentSearch(plugins), bike = createBikeService(databases.live);
  const batch = bike.placeCandidates(context, current.id);
  assert.equal(batch.candidates.items.length, 1);
  const adopted = transaction(databases.live, () => placesService.adopt(context, databases.live, { id: randomUUID(), mode: "candidate", resultId: batch.candidates.resultId, candidateId: batch.candidates.items[0]!.candidateId }));
  const restored = plugins.rollback("bike", updated.version, confirmation(plugins));
  assert.equal(restored.pluginVersion, "1.0.0");
  assert.deepEqual(restored.settings, old.settings);
  assert.deepEqual(restored.declarations, old.declarations);
  assert.deepEqual(restored.manifest, legacy);
  assert.deepEqual(bike.get(context, originalSearch.id), originalSearch);
  assert.deepEqual(bike.get(context, current.id), current);
  assert.deepEqual(getPlace(databases.live, adopted.place.id), adopted.place);
  const rollbackSearch = currentSearch(plugins);
  assert.throws(() => bike.placeCandidates(context, rollbackSearch.id), { code: "STATE_CONFLICT" });
  assert.equal(bike.state(context).display.geojson.features.length, 1);
  // Already-issued common references retain their independent PLACES lifetime.
  assert.equal(placesService.resolveCandidate(context, batch.candidates.resultId, batch.candidates.items[0]!.candidateId).externalId, "N1");
  databases.close(); databases = openDatabases(options);
  plugins = new PluginService(new PluginStore(databases.live, context));
  assert.deepEqual(plugins.store.get("bike"), restored);
  assert.deepEqual(createBikeService(databases.live).get(context, current.id), current);
  assert.deepEqual(getPlace(databases.live, adopted.place.id), adopted.place);
  assert.throws(() => createBikeService(databases.live).placeCandidates(context, rollbackSearch.id), { code: "STATE_CONFLICT" });
  const result = { checkedAt: Date.now(), kind: "real production registry and SQLite with explicitly seeded observation fixture",
    versions: ["1.0.0", "1.1.0"], legacyDeclarations: old.declarations, latestDeclarations: updated.declarations,
    checks: { oldRejectsNewCandidates: true, updateEnablesActualCommonRegistrationAndAdoption: true, rollbackRestoresSettingsManifestDeclarations: true,
      originalManifestUnchanged: true, retainedSearchesAndAdoptedPlaceEqualAfterSQLiteReopen: true, existingCandidateLifetimePreserved: true, rollbackKeepsDisplay: true },
    remaining: "PLUGINS owner runs normal-main HTTP update/rollback and separate OS restart after merge; no fresh provider call performed" };
  writeFileSync(new URL("release-check.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
} finally { databases.close(); rmSync(dir, { recursive: true, force: true }); }
