import test from "node:test";
import assert from "node:assert/strict";
import { defaultSettings, geometryHash } from "./domain.ts";
import { assessCommonRoute } from "./route-evidence.ts";
import type { RouteSnapshot } from "./service.ts";

const context = { personId: "fixture", dataMode: "live" as const, requestId: "fixture", signal: new AbortController().signal };
const geometry = { type: "LineString" as const, coordinates: [[139.701,35.659],[139.702,35.660],[139.703,35.661]] as [number,number][] };
const route: RouteSnapshot = {
  previewId: "FIXTURE", mode: "driving", geometry, fetchedAt: 100, expiresAt: 900100, retention: "storable",
  segmentEvidence: {
    provider: "valhalla", profile: "motorcycle", geometryHash: geometryHash(geometry), routeFetchedAt: 100, fetchedAt: 110,
    sourceUrl: "https://example.test/FIXTURE", osmChangeset: null,
    options: { excludeHighways: true, useHighways: 0, topSpeed: null, departureLocal: "2026-09-15T13:30" },
    warnings: [{ code: 208, text: "FIXTURE: hard exclusions ignored" }],
    edges: [0,1].map(i => ({ wayId: i+1, forward: true, beginShapeIndex: i, endShapeIndex: i+1, roadClass: "primary", use: "road", motorroad: false })),
  },
};
const assess = (r: RouteSnapshot) => assessCommonRoute(context, r, defaultSettings);
test("ignored request can coexist with a verified complete result; missing attrs remain unknown", () => {
  const verified = assess(route);
  assert.equal(verified.resultEvaluation?.requestedExclusion.status, "ignored");
  assert.equal(verified.resultEvaluation?.motorwayAssessment.status, "verified");
  assert.equal(verified.highway.status, "verified");
  assert.equal(verified.vehicle.status, "unknown");
  for (const change of [
    (r: RouteSnapshot) => { r.segmentEvidence!.edges.pop(); },
    (r: RouteSnapshot) => { r.segmentEvidence!.edges[0]!.roadClass = null; },
    (r: RouteSnapshot) => { r.segmentEvidence!.edges[0]!.forward = null; },
    (r: RouteSnapshot) => { r.segmentEvidence!.edges[0]!.use = null; },
    (r: RouteSnapshot) => { r.segmentEvidence!.edges.reverse(); },
  ]) {
    const r = structuredClone(route); change(r);
    assert.equal(assess(r).resultEvaluation?.motorwayAssessment.status, "unknown");
    assert.equal(assess(r).highway.status, "unknown");
  }
  const missing = structuredClone(route); missing.segmentEvidence!.edges[0]!.motorroad = null;
  assert.equal(assess(missing).resultEvaluation?.motorwayAssessment.status, "verified");
  assert.equal(assess(missing).highway.status, "unknown");
  const motorway = structuredClone(route); motorway.segmentEvidence!.edges[0]!.roadClass = "motorway";
  assert.equal(assess(motorway).highway.status, "ineligible");
  const autoOnly = structuredClone(route); autoOnly.segmentEvidence!.edges[0]!.motorroad = true;
  assert.equal(assess(autoOnly).highway.status, "ineligible");
});
test("different geometry, timestamp or invalid edge indices cannot become snapshot evidence", () => {
  for (const change of [
    (r: RouteSnapshot) => { r.geometry.coordinates[0]![0] += .001; },
    (r: RouteSnapshot) => { r.fetchedAt++; },
    (r: RouteSnapshot) => { r.segmentEvidence!.edges[0]!.endShapeIndex = 99; },
  ]) { const r = structuredClone(route); change(r); assert.throws(() => assess(r), { code: "SOURCE_CHANGED" }); }
});
