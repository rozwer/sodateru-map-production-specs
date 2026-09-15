import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../../../', import.meta.url);
const source = JSON.parse(readFileSync(new URL('docs/01_requirements/04_api/openapi.json', root), 'utf8'));
const ref = (name: string) => ({ $ref: '#/components/schemas/' + name });
const tags = { type: 'array', maxItems: 5, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 20 } };
const name = { type: 'string', minLength: 1, maxLength: 20 };
const schemas: Record<string, any> = {};
for (const key of ['FeatureRequest', 'FeatureRequestCreate', 'FeatureRequestPatch']) {
  const schema = structuredClone(source.components.schemas[key]);
  schema.properties.body.maxLength = 200;
  Object.assign(schema.properties, { displayName: name, regionTags: tags, purposeTags: tags });
  if (key === 'FeatureRequest') {
    Object.assign(schema.properties, { empathyCount: { type: 'integer', minimum: 0 }, myEmpathy: { type: 'boolean' } });
    schema.required.push('displayName', 'regionTags', 'purposeTags', 'empathyCount', 'myEmpathy');
  } else if (key === 'FeatureRequestCreate') schema.required = ['id', 'body', 'visibility', 'displayName'];
  schemas[key] = schema;
}
schemas.FeatureRequestEmpathyPatch = { type: 'object', additionalProperties: false, required: ['empathy'], properties: { empathy: { type: 'boolean' } } };
schemas.FeatureRequestGuide = { type: 'object', additionalProperties: false, required: ['title', 'url'], properties: { title: { type: 'string' }, url: { type: 'string', format: 'uri' } } };
const operations = [];
for (const path of ['/feature-requests', '/feature-requests/{requestId}']) {
  for (const [method, operation] of Object.entries(source.paths[path])) operations.push({ ...operation as object, method, path, replaceOperation: true });
}
const single = source.paths['/feature-requests/{requestId}'];
operations.push({ method: 'patch', path: '/feature-requests/{requestId}/empathy', operationId: 'patchFeatureRequestEmpathy', summary: '共感の追加・解除', parameters: single.patch.parameters, requestBody: { required: true, content: { 'application/json': { schema: ref('FeatureRequestEmpathyPatch') } } }, responses: single.patch.responses, description: '本人×投稿一意の望む状態指定。If-Match必須。既に指定状態なら再送として現在値を返し件数と版を増やさない。実際に変更する場合は最新投稿versionを照合する。非公開は本人のみ。' });
operations.push({ method: 'get', path: '/feature-requests/development-guide', operationId: 'getFeatureRequestDevelopmentGuide', summary: '本番リポジトリの開発ガイド', parameters: source.paths['/me'].get.parameters, responses: { '200': { description: '実在確認した本番ガイドURL', content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['data'], properties: { data: ref('FeatureRequestGuide') } } } } } } });
for (const op of operations as any[]) if (op.operationId === 'postFeatureRequests' || op.operationId === 'patchFeatureRequestsRequestId') op.description = '表示名は投稿時の入力を固定保存しプロフィールへ追随しない。明示PATCHでのみ変更。本文は原文200文字以内、公開時は空白のみ不可。titleは最初の空でない行をtrimして生成、空の非公開下書きは「下書き」。互換入力titleは保存値へ使用しない。regionTags/purposeTagsは本人入力を各5件・各1〜20文字・重複なしで保存する。';
writeFileSync(new URL('docs/01_requirements/04_api/fragments/FEATURE-REQUESTS.json', root), JSON.stringify({ taskId: 'FEATURE-REQUESTS', version: '1.0.0', replaceSchemas: ['FeatureRequest', 'FeatureRequestCreate', 'FeatureRequestPatch'], schemas, operations }, null, 2) + '\n');
