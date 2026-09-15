import { readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import { createRequire } from 'node:module';
import { invalid } from './model.ts';

// Validate against the shared contract; no separate copy of the input schema.
const contract = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
const addFormats: typeof import('ajv-formats').default = createRequire(import.meta.url)('ajv-formats');
addFormats(ajv);
ajv.addSchema({ $id: 'records-contract', components: contract.components });
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
export function validateInput(name: string, input: unknown): void {
  let validate = validators.get(name);
  if (!validate) { validate = ajv.compile({ $ref: `records-contract#/components/schemas/${name}` }); validators.set(name, validate); }
  if (!validate(input)) invalid(ajv.errorsText(validate.errors));
}
