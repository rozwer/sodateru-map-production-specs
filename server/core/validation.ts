import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { MiddlewareHandler } from 'hono';
import type { CoreEnv } from './context.ts';
import { CommonError, expectedVersion } from './errors.ts';
import { idempotencyKey } from './idempotency.ts';

type Schema = { [key: string]: unknown; type?: string; $ref?: string; items?: Schema };
interface Parameter { name: string; in: 'header' | 'path' | 'query'; required?: boolean; schema: Schema; $ref?: string }
interface Content { schema: Schema }
interface Operation {
  operationId: string;
  parameters: Parameter[];
  requestBody?: { required?: boolean; content: Record<string, Content> };
  responses: Record<string, unknown>;
}
export interface ApiContract { paths: Record<string, Record<string, Operation>>; components: Record<string, unknown> }
export function loadContract(): ApiContract {
  return JSON.parse(readFileSync(new URL('../../docs/01_requirements/04_api/openapi.json', import.meta.url), 'utf8')) as ApiContract;
}
export function contractValidation(spec: ApiContract = loadContract()): MiddlewareHandler<CoreEnv> {
  const ajv = new Ajv2020({ strict: false, allErrors: true, useDefaults: true });
  addFormats(ajv); ajv.addFormat('binary', true);
  function resolve<T>(value: T): T {
    const ref = (value as { $ref?: string }).$ref;
    if (!ref) return value;
    let target: unknown = spec;
    for (const segment of ref.slice(2).split('/')) target = (target as Record<string, unknown>)[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
    if (!target) throw new Error(`Unresolved contract reference: ${ref}`);
    return target as T;
  }
  const operations = Object.entries(spec.paths).flatMap(([path, methods]) => Object.entries(methods).map(([method, operation]) => {
    const names: string[] = [];
    const pattern = path.split('/').map(segment => {
      if (segment.startsWith('{') && segment.endsWith('}')) { names.push(segment.slice(1, -1)); return '([^/]+)'; }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    const parameters = operation.parameters.map(resolve);
    const group = (location: string) => {
      const selected = parameters.filter(p => p.in === location);
      return ajv.compile({ type: 'object', additionalProperties: false, properties: Object.fromEntries(selected.map(p => [p.name, p.schema])), required: selected.filter(p => p.required).map(p => p.name), components: spec.components });
    };
    const json = operation.requestBody?.content['application/json'];
    return { method: method.toUpperCase(), pattern: new RegExp('^/api/v1' + pattern + '$'), names, operation, parameters, path: group('path'), query: group('query'), body: json ? ajv.compile({ ...json.schema, components: spec.components }) : undefined };
  }));
  function value(raw: string, schema: Schema): unknown {
    const s = resolve(schema);
    if (s.type === 'integer' || s.type === 'number') {
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) || !Number.isFinite(Number(raw))) throw new CommonError('INVALID_REQUEST', '数値queryを読み取れません。');
      return Number(raw);
    }
    if (s.type === 'boolean') {
      if (raw !== 'true' && raw !== 'false') throw new CommonError('INVALID_REQUEST', '真偽値queryを読み取れません。');
      return raw === 'true';
    }
    return raw;
  }
  return async (c, next) => {
    const matched = operations.find(entry => entry.method === c.req.method && entry.pattern.test(c.req.path));
    if (!matched) throw new CommonError('NOT_FOUND', 'API契約が見つかりません。');
    const path: Record<string, unknown> = {};
    const segments = matched.pattern.exec(c.req.path)!;
    for (const [index, name] of matched.names.entries()) {
      try { path[name] = decodeURIComponent(segments[index + 1]!); } catch { throw new CommonError('INVALID_REQUEST', 'パスを読み取れません。'); }
    }
    const query: Record<string, unknown> = {};
    const url = new URL(c.req.url);
    for (const key of new Set(url.searchParams.keys())) {
      const parameter = matched.parameters.find(p => p.in === 'query' && p.name === key);
      if (!parameter) throw new CommonError('INVALID_REQUEST', '未知のqueryです。', false, { fields: [{ path: key, reason: '未知のquery' }] });
      const values = url.searchParams.getAll(key);
      const schema = resolve(parameter.schema);
      if (schema.type === 'array') query[key] = values.map(item => value(item, schema.items ?? {}));
      else {
        if (values.length !== 1) throw new CommonError('INVALID_REQUEST', 'queryが重複しています。', false, { fields: [{ path: key, reason: 'queryの重複' }] });
        query[key] = value(values[0]!, schema);
      }
    }
    if (!matched.path(path) || !matched.query(query)) throw new CommonError('VALIDATION_FAILED', 'パスまたはqueryが入力契約に一致しません。');
    if (matched.parameters.some(p => p.name.toLowerCase() === 'if-match' && (p.required || c.req.header('If-Match') !== undefined))) expectedVersion(c.req.header('If-Match'));
    if (c.req.method === 'POST') idempotencyKey(c.req.header('Idempotency-Key'));
    let body: unknown;
    if (matched.body) {
      if (!/^application\/json(?:;|$)/i.test(c.req.header('Content-Type') ?? '')) throw new CommonError('UNSUPPORTED_MEDIA_TYPE', 'JSONで送信してください。');
      try { body = await c.req.json(); } catch { throw new CommonError('INVALID_REQUEST', 'JSONを読み取れません。'); }
      if (!matched.body(body)) throw new CommonError('VALIDATION_FAILED', '入力が契約に一致しません。');
    } else if (!matched.operation.requestBody && (c.req.header('Content-Length') && c.req.header('Content-Length') !== '0' || c.req.header('Transfer-Encoding'))) {
      throw new CommonError('INVALID_REQUEST', 'この操作は本文を受け付けません。');
    }
    c.set('input', { body, path, query });
    await next();
  };
}
