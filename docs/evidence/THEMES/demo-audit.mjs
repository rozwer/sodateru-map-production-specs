import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const origin = process.env.THEMES_AUDIT_ORIGIN ?? 'http://127.0.0.1:3001';
const headers = () => ({ 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'demo' });
const session = await fetch(`${origin}/api/v1/session`, {
  method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
  body: JSON.stringify({ profileKey: 'self' }),
});
if (!session.ok) throw new Error(`session ${session.status}`);
const cookie = session.headers.get('set-cookie')?.split(';')[0];
if (!cookie) throw new Error('No demo session cookie');
async function get(path) {
  const response = await fetch(`${origin}/api/v1/${path}`, { headers: { ...headers(), Cookie: cookie } });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
const themes = await get('themes?limit=100');
const records = await get('records?limit=100&includeUndated=true');
const theme = themes.items.find(item => item.id === '7452a5ae-dc69-4899-9323-74d8c650b003');
const memo = records.items.find(item => item.body === '静かな場所を歩くと新しい発見がある。');
if (!theme || theme.name !== 'デモ・まち歩き' || theme.colorKey !== 'blue') throw new Error('Browser-created theme was not persisted');
if (!memo) throw new Error('Browser-created memo was not persisted');
const detail = await get(`records/${memo.id}`);
if (detail.data.record.id !== memo.id || detail.data.record.memo?.name !== 'デモの気づき' || !detail.data.record.memo.keywords.includes('静かな場所')) throw new Error('Memo detail mismatch');
const result = { checkedAt: new Date().toISOString(), origin, dataMode: 'demo', source: 'Real browser create/save followed by a separate HTTP session GET', listMemoPresent: memo.memo != null, theme, memo: detail.data.record };
writeFileSync(new URL('./demo-audit.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ themeId: theme.id, memoId: memo.id, themeColor: theme.colorKey, memo: detail.data.record.memo, listMemoPresent: memo.memo != null, useForSuggestions: memo.useForSuggestions }));
