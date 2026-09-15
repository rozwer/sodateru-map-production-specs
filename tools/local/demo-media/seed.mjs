#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiClient } from '../../../packages/api-client/index.ts';
import { acceptFriendship, createFriendship } from '../../../server/features/friends/service.ts';
import { patchSettings, readSettings } from '../../../server/features/settings/service.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const disclosure = '添付写真はデモ用に画像生成したイメージです。実在の店舗・景色を撮影したものではありません。';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} に値を指定してください。`);
  return value;
}

const dbPath = resolve(option('--demo-db', process.env.SODATERU_DEMO_DB_PATH ?? resolve(root, '.local/demo.sqlite')));
const origin = new URL(option('--origin', process.env.SODATERU_API_ORIGIN ?? 'http://127.0.0.1:3001'));
if (basename(dbPath) !== 'demo.sqlite') throw new Error(`demo.sqlite 以外は変更しません: ${dbPath}`);
if (!existsSync(dbPath)) throw new Error(`デモDBがありません: ${dbPath}`);
if (!['127.0.0.1', 'localhost'].includes(origin.hostname)) throw new Error(`ローカルAPI以外へseedしません: ${origin.origin}`);

const assets = {
  cafe: 'motoyama-cafe-generated.jpg',
  park: 'higashiyama-park-generated.jpg',
  bookshop: 'motoyama-bookshop-generated.jpg',
  shrine: 'neighborhood-shrine-generated.jpg',
  bakery: 'neighborhood-bakery-generated.jpg',
  waterfront: 'yokohama-waterfront-generated.jpg',
  venue: 'yokohama-seaside-venue-generated.jpg',
  hotel: 'yokohama-urban-hotel-generated.jpg',
  reading: 'reading-diary-generated.jpg',
};
for (const filename of Object.values(assets)) {
  const bytes = readFileSync(resolve(here, 'assets', filename));
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error(`JPEGとして読めません: ${filename}`);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
const openedPath = String(db.prepare("SELECT file FROM pragma_database_list WHERE name='main'").get()?.file ?? '');
if (resolve(openedPath) !== dbPath) throw new Error(`指定したデモDBと接続先が一致しません: ${openedPath}`);
const self = db.prepare("SELECT person_id FROM core_local_profiles WHERE profile_key='self'").get()?.person_id;
if (typeof self !== 'string') throw new Error('demo/self の本人を確認できません。');

const people = [
  { key: 'haruka', name: 'はるか', bio: 'カフェでゆっくりしたり、本を読んだり。まちを歩いて季節を感じるのが好きです。' },
  { key: 'kota', name: 'こうた', bio: '建築や音楽を楽しみながら、知らない道を歩いています。' },
  { key: 'minami', name: 'みなみ', bio: '自然・カフェ・旅行。季節の色や、小さな発見を残しています。' },
  { key: 'riku', name: 'りく', bio: '映画とアート、カメラが好き。日常の景色を写真にしています。' },
];

const places = [
  { id: 'friends-motoyama-cafe', name: 'コーヒーと本のある暮らし', address: '名古屋市千種区 本山', position: { longitude: 136.9654, latitude: 35.1645 } },
  { id: 'friends-motoyama-books', name: '本山ブックス', address: '名古屋市千種区 本山', position: { longitude: 136.9612, latitude: 35.1603 } },
  { id: 'friends-higashiyama-park', name: '東山公園', address: '名古屋市千種区 東山', position: { longitude: 136.9739, latitude: 35.1582 } },
  { id: 'demo-media-neighborhood-shrine', name: '緑の小さな神社', address: '名古屋市千種区', position: { longitude: 136.9682, latitude: 35.1621 } },
  { id: 'demo-media-neighborhood-bakery', name: '花壇のあるパン屋', address: '名古屋市千種区', position: { longitude: 136.9598, latitude: 35.1661 } },
];

const sharedBodies = {
  haruka: [
    'ここのカフェで読む本は、いつもよりゆっくり時間が流れる気がする☕',
    '素敵な本との出会いがあった！ また来たいな📚',
    '木漏れ日の中を歩いて、気持ちをリセット。緑に囲まれたベンチがお気に入り。',
  ],
  kota: [
    '散歩の帰りに寄るカフェ。窓際で音楽を聴きながらひと休み。',
    '建築の写真集を見つけた。次のまち歩きのヒントになりそう。',
    '朝の空気が気持ちいい。公園を一周すると一日をすっきり始められる。',
  ],
  minami: [
    '友達とおしゃべりしながら飲むコーヒー。落ち着く時間でした。',
    '旅のエッセイを探しに。気になる一冊をゆっくり選べるお店。',
    '木々の色が少しずつ変わっていて、季節の移り変わりを感じた。',
  ],
  riku: [
    '午後の光とコーヒーカップの色がきれいだった。写真を一枚。',
    '映画の本を探しに寄り道。静かな店内で思わず長居しました。',
    '並木道の奥行きがきれい。夕方の光をまた撮りに来たい。',
  ],
};

function sessionClient(personId) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = Date.now();
  db.prepare('INSERT INTO core_sessions(token_hash,person_id,profile_key,created_at,expires_at) VALUES(?,?,?,?,?)')
    .run(tokenHash, personId, `demo-media-${personId}`, now, now + 10 * 60 * 1000);
  const checkedFetch = async (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Cookie', `sodateru_session_demo=${token}`);
    const response = await fetch(url, { ...init, headers });
    const mode = response.headers.get('X-Data-Mode');
    if (mode !== 'demo') throw new Error(`APIがdemo modeを返しませんでした: ${mode ?? 'headerなし'}`);
    return response;
  };
  const api = createApiClient({ baseUrl: `${origin.origin}/api/v1`, fetch: checkedFetch });
  api.setDataMode('demo');
  return { api, close: () => db.prepare('DELETE FROM core_sessions WHERE token_hash=?').run(tokenHash) };
}

function generatedId(recordId, asset) {
  const digest = createHash('sha256').update(`${recordId}:${asset}`).digest('hex').slice(0, 16);
  return `demo-generated-${asset}-${digest}`;
}

async function createPlace(api, place) {
  if (db.prepare('SELECT id FROM places WHERE id=?').get(place.id)) return false;
  await api.request('postPlaces', {
    body: { id: place.id, mode: 'manual', name: place.name, address: place.address, position: place.position, buildingKey: null },
    idempotencyKey: `demo-media-place-${place.id}`,
  });
  return true;
}

async function createRecord(api, record) {
  if (db.prepare('SELECT id FROM records WHERE id=?').get(record.id)) return false;
  await api.request('postRecords', {
    body: {
      id: record.id, kind: 'experience', visitId: null, placeId: record.placeId,
      occurredAt: record.occurredAt, endedAt: null, timePrecision: 'exact', body: record.body,
      purposes: [record.purpose], activities: [], impression: '', periodAnswers: {}, bookmarked: false,
      useForSuggestions: false, topicKey: null, visibility: 'public', sharedWith: [],
    },
    idempotencyKey: `demo-media-record-${record.id}`,
  });
  return true;
}

async function ensureGeneratedPhoto(api, target, result) {
  let detail = (await api.request('getRecordsRecordId', { path: { recordId: target.recordId } })).data;
  const desiredId = generatedId(target.recordId, target.asset);
  let desired = detail.media.data.items.find(item => item.id === desiredId);
  const legacy = detail.media.data.items.filter(item => target.legacyIds?.includes(item.id));
  const retained = detail.media.data.items.filter(item => !legacy.some(old => old.id === item.id));
  if (!desired && retained.some(item => item.kind === 'photo' && item.status === 'ready')) {
    result.retainedExisting.push(target.recordId);
    return;
  }
  if (!desired) {
    const filename = assets[target.asset];
    const bytes = readFileSync(resolve(here, 'assets', filename));
    const positions = detail.media.data.items.map(item => item.position);
    const position = positions.length ? Math.max(...positions) + 1 : 0;
    if (position > 99) throw new Error(`${target.recordId} に画像を追加できる位置がありません。`);
    const form = new FormData();
    form.set('id', desiredId);
    form.set('position', String(position));
    form.set('file', new Blob([bytes], { type: 'image/jpeg' }), filename);
    await api.request('postRecordsRecordIdMedia', {
      path: { recordId: target.recordId }, body: form, version: detail.record.version,
      idempotencyKey: `demo-media-photo-${desiredId}`,
    });
    result.added.push({ recordId: target.recordId, mediaId: desiredId, asset: filename });
    detail = (await api.request('getRecordsRecordId', { path: { recordId: target.recordId } })).data;
    desired = detail.media.data.items.find(item => item.id === desiredId);
    if (!desired) throw new Error(`${target.recordId} の生成画像を再取得できません。`);
  } else {
    result.alreadyPresent.push(target.recordId);
  }
  for (const old of detail.media.data.items.filter(item => target.legacyIds?.includes(item.id))) {
    await api.request('deleteMediaMediaId', { path: { mediaId: old.id }, version: old.version });
    result.replacedLegacy.push({ recordId: target.recordId, mediaId: old.id });
    detail = (await api.request('getRecordsRecordId', { path: { recordId: target.recordId } })).data;
  }
  if (!detail.record.body.includes(disclosure)) {
    await api.request('patchRecordsRecordId', {
      path: { recordId: target.recordId }, body: { body: `${detail.record.body.trimEnd()}\n${disclosure}` }, version: detail.record.version,
    });
    result.disclosed.push(target.recordId);
  }
}

const result = {
  dbPath, origin: origin.origin, mode: 'demo', createdPeople: [], createdPlaces: [], createdRecords: [],
  added: [], alreadyPresent: [], retainedExisting: [], replacedLegacy: [], disclosed: [], untouchedMissing: [],
};
const sessions = [];

try {
  const now = Date.now();
  for (const person of people) {
    const personId = `friends-${person.key}`;
    const existing = db.prepare('SELECT id FROM people WHERE id=?').get(personId);
    if (!existing) {
      db.prepare("INSERT INTO people(id,version,created_at,updated_at,name,bio,avatar_path) VALUES(?,1,?,?,?,?,NULL)")
        .run(personId, now, now, person.name, person.bio);
      result.createdPeople.push(personId);
    }
    const settings = readSettings(db, personId);
    if (settings.profileVisibility !== 'public') patchSettings(db, personId, settings.version, { profileVisibility: 'public' });
    if (!db.prepare('SELECT id FROM friendships WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)').get(self, personId, personId, self)) {
      const friendship = createFriendship(db, self, { id: `friends-self-${person.key}`, recipientId: personId });
      acceptFriendship(db, personId, friendship.id, friendship.version, { status: 'accepted' });
    }
  }

  const clients = new Map();
  for (const person of people) {
    const personId = `friends-${person.key}`;
    const session = sessionClient(personId); sessions.push(session); clients.set(person.key, session.api);
  }
  const selfSession = sessionClient(self); sessions.push(selfSession);

  const placeApi = clients.get('haruka');
  for (const place of places) if (await createPlace(placeApi, place)) result.createdPlaces.push(place.id);

  const targets = [];
  for (const person of people) {
    const api = clients.get(person.key);
    for (const [index, asset] of ['cafe', 'bookshop', 'park'].entries()) {
      const recordId = `friends-${person.key}-record-${index}`;
      if (await createRecord(api, {
        id: recordId, placeId: places[index].id, occurredAt: Date.UTC(2026, 8, 14 - index * 3, 4),
        body: sharedBodies[person.key][index], purpose: ['カフェ', '本', '散歩'][index],
      })) result.createdRecords.push(recordId);
      targets.push({ api, recordId, asset, legacyIds: [`${recordId}-photo`] });
    }
  }

  const extraShared = [
    { person: 'riku', recordId: 'demo-media-riku-shrine', placeId: places[3].id, asset: 'shrine', purpose: '散歩', occurredAt: Date.UTC(2026, 8, 13, 6), body: '木立の奥にある小さな神社。静かな参道で、街の音が少し遠く感じられました。' },
    { person: 'minami', recordId: 'demo-media-minami-bakery', placeId: places[4].id, asset: 'bakery', purpose: '食事', occurredAt: Date.UTC(2026, 8, 12, 2), body: '住宅街の小さなパン屋へ。花壇を眺めながら、焼きたてを選ぶ時間も楽しかったです。' },
  ];
  for (const record of extraShared) {
    const api = clients.get(record.person);
    if (await createRecord(api, { ...record, id: record.recordId })) result.createdRecords.push(record.recordId);
    targets.push({ api, recordId: record.recordId, asset: record.asset });
  }

  const selfRows = db.prepare(`SELECT r.id,r.body FROM records r
    WHERE r.person_id=? AND NOT EXISTS(SELECT 1 FROM media m WHERE m.record_id=r.id)
    ORDER BY r.created_at,r.id`).all(self);
  for (const row of selfRows) {
    let asset = null;
    if (row.id === 'yokohama-20260915-record-venue') asset = 'venue';
    else if (row.id === 'yokohama-20260915-record-plans') asset = 'waterfront';
    else if (row.id === 'yokohama-20260915-record-morning-plan') asset = 'hotel';
    else if (row.id === 'diagnosis-demo-20260915--1') asset = 'reading';
    else if (row.id === 'diagnosis-demo-20260915-0') asset = 'bakery';
    else if (/^(BUILDING-RECORDS|実建物着色)/.test(row.body)) asset = 'cafe';
    if (asset) targets.push({ api: selfSession.api, recordId: row.id, asset });
    else result.untouchedMissing.push(row.id);
  }

  for (const target of targets) await ensureGeneratedPhoto(target.api, target, result);

  const visibleMissing = db.prepare(`SELECT r.id,r.person_id,r.body FROM records r
    WHERE (r.person_id=? OR r.visibility IN ('selected','public'))
      AND NOT EXISTS(SELECT 1 FROM media m WHERE m.record_id=r.id AND m.kind='photo' AND m.status='ready')
    ORDER BY r.created_at,r.id`).all(self);
  result.visibleMissingAfter = visibleMissing.map(row => ({ id: row.id, personId: row.person_id, body: String(row.body).slice(0, 80) }));
  console.log(JSON.stringify(result, null, 2));
  if (result.visibleMissingAfter.length) process.exitCode = 2;
} finally {
  for (const session of sessions.reverse()) {
    try { session.close(); } catch { /* best-effort cleanup after a failed request */ }
  }
  db.close();
}
