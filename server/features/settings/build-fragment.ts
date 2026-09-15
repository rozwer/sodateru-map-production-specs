import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Settings, SettingsPatch, PersonPatch } from './schema.ts';

const root = new URL('../../../', import.meta.url);
const source = JSON.parse(readFileSync(new URL('docs/01_requirements/04_api/openapi.json', root), 'utf8'));
const Person = structuredClone(source.components.schemas.Person);
Person.properties.name.maxLength = 20;
Person.properties.bio.maxLength = 200;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const response = (name: string) => ({ description: '保存済みの現在値', content: { 'application/json': { schema: ref(name) } } });
const result = (name: string) => ({ type: 'object', properties: { data: ref(name) }, required: ['data'], additionalProperties: false });
const errorResponses = Object.fromEntries(Object.entries(source.paths['/me'].patch.responses).filter(([status]) => status !== '200'));
const getParameters = source.paths['/me'].get.parameters;
const patchParameters = source.paths['/me'].patch.parameters;
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const dataProperties = { person: ref('Person'), settings: ref('Settings'), categories: { type: 'array', items: {
  type: 'object', additionalProperties: false,
  properties: { kind: { type: 'string', enum: ['profile', 'settings', 'records'] }, label: { type: 'string' }, count: { type: 'integer', minimum: 0 }, readUrl: { type: 'string' }, exportUrl: nullableString, deletionPreviewUrl: nullableString, deleteUrl: nullableString, version: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] }, deletionEffect: { type: 'string' } },
  required: ['kind', 'label', 'count', 'readUrl', 'exportUrl', 'deletionPreviewUrl', 'deleteUrl', 'version', 'deletionEffect'],
} }, recordActions: { type: 'object', additionalProperties: false, properties: { exportTemplate: { type: 'string' }, deletionPreviewTemplate: { type: 'string' }, deleteTemplate: { type: 'string' } }, required: ['exportTemplate', 'deletionPreviewTemplate', 'deleteTemplate'] } };
const fragment = {
  taskId: 'SETTINGS', version: '1.0.0', replaceSchemas: ['Person', 'PersonPatch'],
  schemas: { Person, PersonPatch, Settings, SettingsPatch, SettingsResult: result('Settings'), OwnDataSummary: { type: 'object', additionalProperties: false, properties: dataProperties, required: Object.keys(dataProperties) }, OwnDataSummaryResult: result('OwnDataSummary') },
  operations: [
    { ...source.paths['/me'].patch, method: 'patch', path: '/me', replaceOperation: true, description: '本人プロフィール編集。表示名1〜20文字・紹介200文字以内。変更しない項目は省略、avatarUrl=nullでアイコン参照解除。If-MatchはPerson.version。' },
    { method: 'get', path: '/me/settings', operationId: 'getMeSettings', summary: '本人の利用設定', parameters: getParameters, responses: { '200': response('SettingsResult'), ...errorResponses }, description: '本人contextとmode別DBから取得。未保存は明記した既定値とversion=1。ブラウザ権限の実際の状態とは分離。' },
    { method: 'patch', path: '/me/settings', operationId: 'patchMeSettings', summary: '本人の利用設定を保存', parameters: patchParameters, requestBody: { required: true, content: { 'application/json': { schema: ref('SettingsPatch') } } }, responses: { '200': response('SettingsResult'), ...errorResponses }, description: 'If-MatchはSettings.version。トップレベル省略は維持、内部オブジェクト・配列は全置換。AI許可は次の外部送信直前に再取得、提案停止は生成/現在候補表示に適用。履歴は削除しない。保存期間変更は方針の保存で、過去データの即時一括削除を行わない。' },
    { method: 'delete', path: '/me/settings', operationId: 'resetMeSettings', summary: '本人設定を初期値へ戻す', parameters: patchParameters, responses: { '204': { description: '設定のみ初期化。versionは増加し履歴の古い版を再利用しない。' }, ...errorResponses } },
    { method: 'get', path: '/me/data', operationId: 'getMeData', summary: '本人データ一覧と管理入口', parameters: getParameters, responses: { '200': response('OwnDataSummaryResult'), ...errorResponses } },
    { method: 'get', path: '/me/settings/export', operationId: 'exportMeSettings', summary: 'プロフィールと設定を文書へ書出す', parameters: getParameters, responses: { '200': { description: '単体の日本語HTML文書を添付ダウンロード。記録・媒体は各記録の書出し入口を利用。', content: { 'text/html': { schema: { type: 'string' } } } }, ...errorResponses } },
    { method: 'get', path: '/me/icon', operationId: 'getMeIcon', summary: '本人アイコンの画像取得', parameters: getParameters, responses: { '200': { description: '保存した本人画像。private,no-store。', content: Object.fromEntries(['image/png', 'image/jpeg', 'image/webp'].map(mime => [mime, { schema: { type: 'string', format: 'binary' } }])) }, ...errorResponses } },
    { method: 'patch', path: '/me/icon', operationId: 'patchMeIcon', summary: '本人アイコンを変更', parameters: patchParameters, requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', additionalProperties: false, required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { '200': source.paths['/me'].patch.responses['200'], ...errorResponses, '413': { description: '50MiB超過' }, '415': { description: 'JPEG/PNG/WebP以外または内容不一致' } }, description: 'If-MatchはPerson.version。1枚50MiBまで。元画像は本人/モード別の専用ファイルとして保存。差替えは古い本人アイコンだけ清掃し、記録mediaは削除しない。' },
    { method: 'delete', path: '/me/icon', operationId: 'deleteMeIcon', summary: '本人アイコンだけを削除', parameters: patchParameters, responses: { '204': { description: 'アイコンのみ削除。Person.versionは増加。記録/媒体/名前/紹介は維持。' }, ...errorResponses } },
  ],
};
mkdirSync(new URL('docs/01_requirements/04_api/fragments/', root), { recursive: true });
writeFileSync(new URL('docs/01_requirements/04_api/fragments/SETTINGS.json', root), `${JSON.stringify(fragment, null, 2)}\n`);
