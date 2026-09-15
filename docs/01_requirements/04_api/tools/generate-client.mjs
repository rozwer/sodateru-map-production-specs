import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const apiRoot = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(apiRoot, '../../..', 'packages/api-client');
const spec = JSON.parse(readFileSync(resolve(apiRoot, 'openapi.json'), 'utf8'));
function ref(value) {
  if (!value?.$ref) return value;
  let target = spec;
  for (const segment of value.$ref.slice(2).split('/')) target = target[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
  if (!target) throw new Error(`Missing reference ${value.$ref}`);
  return target;
}
function type(schema = {}) {
  if (schema === true) return 'unknown';
  if (schema === false) return 'never';
  if (schema.$ref) return schema.$ref.split('/').at(-1);
  if ('const' in schema) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map(v => JSON.stringify(v)).join(' | ');
  if (schema.oneOf || schema.anyOf) return '(' + (schema.oneOf ?? schema.anyOf).map(type).join(' | ') + ')';
  if (schema.allOf) return '(' + schema.allOf.map(type).join(' & ') + ')';
  if (Array.isArray(schema.type)) return '(' + schema.type.map(t => type({ ...schema, type: t })).join(' | ') + ')';
  if (schema.format === 'binary') return 'Blob';
  if (schema.type === 'integer' || schema.type === 'number') return 'number';
  if (schema.type === 'boolean' || schema.type === 'string' || schema.type === 'null') return schema.type;
  if (schema.type === 'array') {
    if (schema.prefixItems) return '[' + schema.prefixItems.map(type).join(', ') + ']';
    return `Array<${type(schema.items)}>`;
  }
  if (schema.type === 'object' || schema.properties) {
    const fields = Object.entries(schema.properties ?? {}).map(([key, value]) => `${JSON.stringify(key)}${schema.required?.includes(key) ? '' : '?'}: ${type(value)}`);
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') fields.push(`[key: string]: ${type(schema.additionalProperties)}`);
    else if (schema.additionalProperties !== false && !schema.properties) fields.push('[key: string]: unknown');
    return '{ ' + fields.join('; ') + ' }';
  }
  return 'unknown';
}
const lines = ['// Generated from the composed OpenAPI. Run bun run contracts:build.', ''];
for (const [name, schema] of Object.entries(spec.components.schemas)) lines.push(`export type ${name} = ${type(schema)};`);
lines.push('', 'export interface OperationMap {');
const runtime = {};
for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
  const params = op.parameters.map(ref);
  const fields = [];
  const groups = {};
  for (const location of ['path', 'query']) {
    const list = params.filter(p => p.in === location);
    if (!list.length) continue;
    const required = list.some(p => p.required);
    const props = list.map(p => `${JSON.stringify(p.name)}${p.required ? '' : '?'}: ${type(p.schema)}`);
    fields.push(`${location}${required ? '' : '?'}: { ${props.join('; ')} }`);
    groups[location] = list.map(p => ({ name: p.name, required: !!p.required, schema: p.schema }));
  }
  const body = ref(op.requestBody);
  const content = body?.content;
  if (content) fields.push(`body${body.required ? '' : '?'}: ${content['multipart/form-data'] ? 'FormData' : type(content['application/json']?.schema)}`);
  if (params.some(p => p.in === 'header' && p.name.toLowerCase() === 'if-match')) fields.push('version: number');
  if (params.some(p => p.in === 'header' && p.name.toLowerCase() === 'idempotency-key')) fields.push('idempotencyKey: string');
  fields.push('signal?: AbortSignal');
  const success = Object.entries(op.responses).filter(([code]) => /^2\d\d$/.test(code)).map(([, value]) => {
    const response = ref(value);
    if (!response.content) return 'undefined';
    if (!response.content['application/json']) return 'Blob';
    return type(response.content['application/json'].schema);
  });
  lines.push(`  ${JSON.stringify(op.operationId)}: { input: { ${fields.join('; ')} }; output: ${[...new Set(success)].join(' | ')} };`);
  runtime[op.operationId] = { method: method.toUpperCase(), path, query: groups.query ?? [], hasBody: !!body, multipart: !!content?.['multipart/form-data'], requiresVersion: fields.includes('version: number'), requiresKey: fields.includes('idempotencyKey: string') };
}
lines.push('}', 'export type OperationId = keyof OperationMap;', 'export type OperationInput<T extends OperationId> = OperationMap[T]["input"];', 'export type OperationOutput<T extends OperationId> = OperationMap[T]["output"];', '');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'types.generated.ts'), lines.join('\n'));
writeFileSync(resolve(output, 'operations.generated.ts'), '// Generated from composed OpenAPI.\nexport const operations = ' + JSON.stringify(runtime, null, 2) + ' as const;\n');
console.log(`Generated ${Object.keys(runtime).length} typed operations`);
