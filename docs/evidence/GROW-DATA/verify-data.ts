/** Run from repository root: mise exec -- bun docs/evidence/GROW-DATA/verify-data.ts */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createReferenceCatalog, createReferenceRequestDtos, createReferenceTrial, referencePhotos } from "../../../src/features/plugins/reference-data";
import { validateTrialPreview } from "../../../server/features/plugins/preview";
const schemas = JSON.parse(readFileSync("docs/01_requirements/04_api/openapi.json", "utf8")).components.schemas;
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const [name, values] of [
  ["PluginCatalog", [createReferenceCatalog("store"), createReferenceCatalog("manage")]],
  ["FeatureRequest", createReferenceRequestDtos()],
] as const) {
  const validate = ajv.compile({ components: { schemas }, $ref: `#/components/schemas/${name}` });
  for (const value of values) assert.ok(validate(value), JSON.stringify(validate.errors));
}
for (const id of ["fixture-bike", "fixture-pilgrimage", "fixture-disaster"]) {
  for (const phase of ["before", "after"] as const) validateTrialPreview(createReferenceTrial(id, phase));
}
for (const photo of Object.values(referencePhotos)) {
  const metadata = await sharp(fileURLToPath(photo.url)).metadata();
  assert.ok(metadata.width && metadata.height);
  console.log(`${photo.alt}: ${metadata.width} x ${metadata.height}`);
}
console.log("PASS: 2 catalogs and 3 posts validate against current OpenAPI; 6 trial states validate with backend preview validator; 3 images decode.");
