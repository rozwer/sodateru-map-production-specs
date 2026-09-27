/** In-browser examples for the explicitly selected demo mode. Live requests never enter here. */
import { ApiError, type OperationId } from '../../packages/api-client/index';
import coffee from '../features/feature-requests/assets/coffee.jpg';
import park from '../features/feature-requests/assets/park.jpg';
import hinata from '../features/companion/assets/hinata.webp';

type Item = Record<string, any>;
type DemoData = { places: Item[]; records: Item[]; visits: Item[]; deletedRecordIds: string[]; deletedMediaIds: string[]; themes: Item[]; checkins: Item[]; suggestions: Item[]; batches: Item[]; media: Record<string, Item[]>; bookmarks: Item[]; routeResults: Item[]; routes: Item[]; dialogues: Item[]; conversations: Item[]; messages: Item[]; conversationResults: Record<string, string>; comparisons: Item[]; runs: Item[]; questions: Item[]; cards: Item[]; reactions: Item[]; recipes: Item[]; planSets: Item[]; companionSettings: Item };
const ids = {
  cafe: '0a10d000-0000-4000-8000-000000000001', park: '0a10d000-0000-4000-8000-000000000002',
  coffeeRecord: '0a10d000-0000-4000-8000-000000000011', parkRecord: '0a10d000-0000-4000-8000-000000000012',
  theme: '0a10d000-0000-4000-8000-000000000021', themePark: '0a10d000-0000-4000-8000-000000000022',
  suggestionCafe: '0a10d000-0000-4000-8000-000000000031', suggestionPark: '0a10d000-0000-4000-8000-000000000032',
  friend: '0a10d000-0000-4000-8000-000000000061', friendship: '0a10d000-0000-4000-8000-000000000062',
  companion: '0a10d000-0000-4000-8000-000000000071', import: '0a10d000-0000-4000-8000-000000000072',
};
let personId: string | null = null;
let data: DemoData | null = null;
const now = () => Date.now();
const page = (items: Item[]) => ({ items, nextCursor: null });
const fileDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});
const mergeById = (left: Item[], right: Item[]) => {
  const items = new Map<string, Item>();
  for (const item of [...left, ...right]) {
    const previous = items.get(item.id);
    if (!previous || (item.updatedAt ?? 0) >= (previous.updatedAt ?? 0)) items.set(item.id, item);
  }
  return [...items.values()];
};
const save = () => {
  if (!personId || !data) return;
  const key = `sodateru.demo-examples:${personId}`;
  try {
    const previous = localStorage.getItem(key);
    if (previous) {
      const stored = JSON.parse(previous) as DemoData;
      data.deletedRecordIds = [...new Set([...(stored.deletedRecordIds ?? []), ...data.deletedRecordIds])];
      data.deletedMediaIds = [...new Set([...(stored.deletedMediaIds ?? []), ...data.deletedMediaIds])];
      data.records = mergeById(stored.records ?? [], data.records).filter(record => !data!.deletedRecordIds.includes(record.id));
      for (const [recordId, items] of Object.entries(stored.media ?? {}))
        data.media[recordId] = mergeById(items, data.media[recordId] ?? []);
      for (const recordId of Object.keys(data.media))
        data.media[recordId] = data.media[recordId]!.filter(item => !data!.deletedMediaIds.includes(item.id));
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) { console.warn('デモ例のブラウザ保存に失敗しました。', error); }
};
// Older demo profiles keep their edits. Update only generated sample fields, never a person's own text.
function presentStoredExamples(d: DemoData) {
  for (const place of d.places) {
    if (place.id === ids.cafe && place.name === '本山のカフェ（表示例）') place.name = '本山のカフェ';
    if (place.id === ids.park && place.name === '東山公園（表示例）') place.name = '東山公園';
  }
  for (const theme of d.themes) {
    if (theme.id === ids.theme && theme.description === 'ゆっくり過ごせる場所（表示例）') theme.description = 'ゆっくり過ごせる場所';
    if (theme.id === ids.themePark && theme.description === '自然にふれる場所（表示例）') theme.description = '自然にふれる場所';
  }
  for (const suggestion of d.suggestions) {
    if (suggestion.id === ids.suggestionCafe && suggestion.title === '静かなカフェで休む（表示例）') suggestion.title = '静かなカフェで休む';
    if (suggestion.id === ids.suggestionPark && suggestion.title === '緑の中を散歩（表示例）') suggestion.title = '緑の中を散歩';
    if (suggestion.reason === '希望に合わせたデモ候補です。実AIによる提案ではありません。') suggestion.reason = '希望に合いそうな場所です。';
  }
  for (const message of d.messages) if (message.role === 'assistant') {
    if (message.body.endsWith('（デモ表示）。')) message.body = message.body.replace('（デモ表示）。', '。');
    if (message.body.endsWith('（表示例）。')) message.body = message.body.replace('（表示例）。', '。');
  }
  for (const route of d.routes) if (route.title?.endsWith('（表示例）')) route.title = route.title.replace('（表示例）', '');
  for (const card of d.cards) {
    if (card.bridge === '見慣れた場所でも、視点を変えると違う発見があります（表示例）。') card.bridge = '見慣れた場所でも、視点を変えると違う発見があります。';
    if (card.knowledge === '形・色・音などを観察してみましょう（デモ用の説明）。') card.knowledge = '形・色・音などを観察してみましょう。';
    for (const source of card.sources ?? []) if (source.title === 'デモ表示例') source.title = '街の観察';
  }
  for (const run of d.runs) {
    if (run.task === 'diary' && run.result?.text === 'カフェでひと息つき、公園を散歩しました。（記録を使ったデモ下書き）') run.result.text = 'カフェでひと息つき、公園を散歩しました。';
    if (run.task === 'extract' && run.result?.question?.text?.endsWith('（表示例）')) run.result.question.text = run.result.question.text.replace('（表示例）', '');
  }
  for (const dialogue of d.dialogues) for (const place of dialogue.places ?? []) {
    if (place.placeId === ids.cafe) place.name = '本山のカフェ';
    if (place.placeId === ids.park) place.name = '東山公園';
  }
  for (const planSet of d.planSets) for (const plan of planSet.plans ?? []) {
    if (plan.explanation?.startsWith('デモ：本山周辺の固定サンプルです。'))
      plan.explanation = plan.explanation.replace('デモ：本山周辺の固定サンプルです。', '本山周辺の候補です。').replace('の表示例です。', 'です。');
  }
}
const missing = () => { throw new ApiError(404, 'NOT_FOUND', '項目が見つかりません。', crypto.randomUUID()); };
function makeData(owner: string): DemoData {
  const time = now(), hour = 3600000;
  const places = [
    { id: ids.cafe, name: '本山のカフェ', address: '名古屋市千種区本山', coordinates: [136.9638, 35.1668], categories: ['cafe'], provider: 'demo', externalId: null, buildingKey: null, sourceUrl: null, attribution: '', fetchedAt: null, version: 1, createdAt: time, updatedAt: time },
    { id: ids.park, name: '東山公園', address: '名古屋市千種区東山元町', coordinates: [136.976, 35.16], categories: ['park'], provider: 'demo', externalId: null, buildingKey: null, sourceUrl: null, attribution: '', fetchedAt: null, version: 1, createdAt: time, updatedAt: time },
  ];
  const record = (id: string, placeId: string, body: string, hoursAgo: number, purposes: string[]): Item => ({
    id, version: 1, createdAt: time, updatedAt: time, personId: owner, kind: 'experience',
    visitId: id === ids.coffeeRecord ? '0a10d000-0000-4000-8000-000000000051' : '0a10d000-0000-4000-8000-000000000052', placeId,
    occurredAt: time - hoursAgo * hour, endedAt: null, timePrecision: 'approximate', body, purposes, activities: [],
    impression: '心地よかった', periodAnswers: {}, bookmarked: false, useForSuggestions: true, topicKey: null,
    visibility: 'private', sharedWith: [], effectivePlaceId: placeId, effectiveStartedAt: time - hoursAgo * hour,
    effectiveEndedAt: null, effectiveTimePrecision: 'approximate', memo: null,
  });
  const records = [
    record(ids.coffeeRecord, ids.cafe, 'カフェでひと息\n窓際の席でコーヒーを飲みながら読書。', 4, ['静かに読書する']),
    record(ids.parkRecord, ids.park, '東山公園を散歩\n緑の中をゆっくり歩いて気分転換。', 2, ['散歩する']),
  ];
  const media = Object.fromEntries([[ids.coffeeRecord, coffee], [ids.parkRecord, park]].map(([recordId, url], position) => [recordId, [{
    id: `0a10d000-0000-4000-8000-00000000004${position + 1}`, version: 1, createdAt: time, updatedAt: time,
    recordId, kind: 'photo', mimeType: 'image/jpeg', byteSize: 1, position: 0, status: 'ready', contentUrl: url,
  }]]));
  const themes = [
    { id: ids.theme, version: 1, createdAt: time, updatedAt: time, personId: owner, name: '静かな寄り道', description: 'ゆっくり過ごせる場所', recordIds: [ids.coffeeRecord], colorKey: 'teal', coverMediaId: media[ids.coffeeRecord][0].id },
    { id: ids.themePark, version: 1, createdAt: time, updatedAt: time, personId: owner, name: '緑の中を歩く', description: '自然にふれる場所', recordIds: [ids.parkRecord], colorKey: 'green', coverMediaId: media[ids.parkRecord][0].id },
  ];
  return { places, records, visits: [], deletedRecordIds: [], deletedMediaIds: [], themes, checkins: [], suggestions: [], batches: [], media, bookmarks: [], routeResults: [], routes: [], dialogues: [], conversations: [], messages: [], conversationResults: {}, comparisons: [], runs: [], questions: [], cards: [], reactions: [], recipes: [], planSets: [],
    companionSettings: { selectedCompanionId: ids.companion, visible: true, size: 'medium', reducedMotion: false, version: 1 } };
}
export function setDemoPerson(id: string | null) {
  if (id === personId) return;
  personId = id; data = null;
  if (!id) return;
  try { const stored = localStorage.getItem(`sodateru.demo-examples:${id}`); if (stored) data = JSON.parse(stored) as DemoData; } catch { /* use examples */ }
  data ??= makeData(id);
  data.routeResults ??= []; data.routes ??= [];
  data.dialogues ??= []; data.conversations ??= []; data.messages ??= []; data.conversationResults ??= {};
  data.comparisons ??= [];
  data.runs ??= []; data.questions ??= [];
  data.cards ??= []; data.reactions ??= [];
  data.recipes ??= []; data.planSets ??= [];
  data.deletedRecordIds ??= [];
  data.deletedMediaIds ??= [];
  data.visits ??= [];
  data.companionSettings ??= { selectedCompanionId: ids.companion, visible: true, size: 'medium', reducedMotion: false, version: 1 };
  presentStoredExamples(data);
  data.records.forEach((record, index) => { if (record.kind === 'experience' && !record.visitId) record.visitId = `0a10d000-0000-4000-8000-00000000005${index + 1}`; });
}
const detail = (place: Item, owner: string, records: Item[]) => ({
  place, colocated: [], ownRecords: { status: 'ready', items: records.filter(r => r.placeId === place.id).map(r => ({
    id: r.id, kind: r.kind, body: r.body, person: { id: owner, displayName: '自分', iconPath: null },
    place: { id: place.id, name: place.name, address: place.address, coordinates: place.coordinates },
    effectiveAt: r.effectiveStartedAt, endedAt: r.effectiveEndedAt, timePrecision: r.timePrecision,
    visitStatus: 'confirmed', purposes: r.purposes, impression: r.impression, topicKey: r.topicKey,
    visibility: r.visibility, version: r.version, sourceRefs: [],
    media: [{ id: r.id + '-photo', kind: 'photo', mimeType: 'image/jpeg', byteSize: 1, position: 0,
      status: 'ready', contentUrl: place.id === ids.cafe ? coffee : park }],
  })), error: null }, sharedRecords: { status: 'ready', items: [], error: null },
  visits: { status: 'ready', items: [], error: null }, openingHours: null, entrances: [], correctedFields: [],
  description: { text: '', sourceUrl: null, fetchedAt: now(), verificationStatus: 'unverified' },
  photos: [{ url: place.id === ids.cafe ? coffee : park, sourceUrl: '', attribution: '', fetchedAt: now(), verificationStatus: 'unverified' }],
});
const visits = (d: DemoData, owner: string) => [...d.records.filter(r => r.kind === 'experience' && r.placeId).map((r, index) => ({
  id: `0a10d000-0000-4000-8000-00000000005${index + 1}`, version: 1, createdAt: r.createdAt,
  updatedAt: r.updatedAt, personId: owner, placeId: r.placeId, startedAt: r.occurredAt, endedAt: r.endedAt,
  timePrecision: r.timePrecision, origin: 'manual', status: 'confirmed',
})), ...d.visits];
const demoFriend = () => ({ id: ids.friend, name: 'ゆう', bio: '散歩と喫茶店が好きです。',
  avatarUrl: null, version: 1, createdAt: now(), updatedAt: now() });
export const demoCompanion = () => ({ id: ids.companion, importId: ids.import, name: 'ひなた',
  source: 'import' as const, version: 1, createdAt: now() });
export function selectDemoCompanion(id: string) { if (data) { data.companionSettings.selectedCompanionId = id; data.companionSettings.version++; save(); } }
const sharedRecords = (d: DemoData) => d.records.filter(r => r.placeId).map(r => {
  const place = d.places.find(p => p.id === r.placeId)!;
  return { id: `friend-${r.id}`, kind: r.kind, body: r.body, person: { id: ids.friend, displayName: 'ゆう', iconPath: null },
    place: { id: place.id, name: place.name, address: place.address, coordinates: place.coordinates },
    effectiveAt: r.effectiveStartedAt, endedAt: r.effectiveEndedAt, timePrecision: r.timePrecision,
    visitStatus: 'confirmed', purposes: r.purposes, impression: r.impression, topicKey: r.topicKey,
    visibility: 'selected', version: 1, sourceRefs: [], media: [{ id: `friend-photo-${r.id}`, kind: 'photo',
      mimeType: 'image/jpeg', byteSize: 1, position: 0, status: 'ready', contentUrl: place.id === ids.cafe ? coffee : park }] };
});
export function demoRequest(operation: OperationId, raw: unknown): unknown | undefined {
  if (!personId || !data) return undefined;
  const input = raw as { path?: Record<string, string>; query?: Record<string, any>; body?: Item; signal?: AbortSignal };
  if (input.signal?.aborted) throw new DOMException('中断しました', 'AbortError');
  const body = input.body ?? {}, path = input.path ?? {}, query = input.query ?? {}, owner = personId, d = data;
  switch (operation) {
    case 'getReflectionDaysDate': {
      const date = path.date ?? new Date().toLocaleDateString('sv-SE');
      const from = Date.parse(`${date}T00:00:00+09:00`), to = from + 86400000;
      const selected = d.records.filter(r => r.effectiveStartedAt !== null && r.effectiveStartedAt >= from && r.effectiveStartedAt < to);
      return { data: { date, timeZone: query.timeZone ?? 'Asia/Tokyo', from, to,
        visits: { status: 'ready', data: page(visits(d, owner).filter(v => v.startedAt >= from && v.startedAt < to)) },
        records: { status: 'ready', data: page(selected) }, checkins: { status: 'ready', data: page(d.checkins.filter(c => c.localDate === date)) } } };
    }
    case 'getVisits': return page(visits(d, owner).filter(v => (!query.from || v.startedAt >= query.from) && (!query.to || v.startedAt < query.to)));
    case 'getVisitsVisitId': {
      const visit = visits(d, owner).find(v => v.id === path.visitId);
      if (visit) return { data: visit };
      const linked = d.records.find(r => r.visitId === path.visitId);
      if (!linked) return undefined;
      return { data: { id: path.visitId, version: 1, createdAt: linked.createdAt, updatedAt: linked.updatedAt,
        personId: owner, placeId: linked.effectivePlaceId ?? linked.placeId ?? ids.cafe,
        startedAt: linked.effectiveStartedAt ?? linked.occurredAt, endedAt: linked.effectiveEndedAt ?? linked.endedAt,
        timePrecision: linked.effectiveTimePrecision ?? linked.timePrecision, origin: 'manual', status: 'confirmed' } };
    }
    case 'postVisits': {
      const visit = { ...body, personId: owner, status: 'candidate', version: 1, createdAt: now(), updatedAt: now() };
      d.visits.push(visit); save(); return { data: visit };
    }
    case 'patchVisitsVisitId': {
      const visit = d.visits.find(v => v.id === path.visitId) ?? missing();
      Object.assign(visit, body, { version: visit.version + 1, updatedAt: now() }); save(); return { data: visit };
    }
    case 'getMapGrowth': return page(d.places.map(p => ({
      place: p, confirmedVisitCount: d.records.filter(r => r.placeId === p.id).length,
      purposes: d.records.filter(r => r.placeId === p.id).flatMap(r => r.purposes), sourceRefs: [], stage: 1,
    })));
    case 'getPlaces': return page(d.places.filter(p => !query.q || p.name.includes(query.q)));
    case 'getPeople': return page([demoFriend()].filter(p => !query.q || p.name.includes(query.q)));
    case 'getCompanion': return path.companionId === ids.companion ? { data: demoCompanion() } : undefined;
    case 'getCompanionImport': return path.importId === ids.import ? { data: { id: ids.import, name: 'ひなた',
      manifest: { id: ids.companion, displayName: 'ひなた', description: 'いっしょに街を歩く相棒です。',
        spriteVersionNumber: 2, spritesheetPath: 'spritesheet.webp' },
      requiredActions: ['idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'waiting', 'running', 'review',
        ...Array.from({ length: 16 }, (_, i) => `gaze-${i * 22.5}`)], confirmedActions: [], version: 1, createdAt: now() } } : undefined;
    case 'getCompanionAtlas': return path.importId === ids.import ? fetch(hinata, { signal: input.signal }).then(response => response.blob()) : undefined;
    case 'getCompanionSettings': return { data: d.companionSettings };
    case 'updateCompanionSettings': Object.assign(d.companionSettings, body, { version: d.companionSettings.version + 1 }); save(); return { data: d.companionSettings };
    case 'getPeoplePersonId': return { data: path.personId === ids.friend ? demoFriend() : missing() };
    case 'getFriendships': return page([{ id: ids.friendship, requesterId: owner, recipientId: ids.friend,
      status: 'accepted', version: 1, createdAt: now(), updatedAt: now() }]);
    case 'getSharedRecords': {
      const items = query.audience === 'own' ? d.places.flatMap(place => detail(place, owner, d.records).ownRecords.items)
        : sharedRecords(d).filter(r => !query.personIds?.length || query.personIds.includes(r.person.id));
      return page(items);
    }
    case 'getKnowledge':
    case 'getPlacesPlaceIdVoices': {
      const items = sharedRecords(d).filter(r => (!query.placeId && !path.placeId || r.place?.id === (query.placeId ?? path.placeId))
        && (!query.q || `${r.body} ${r.place?.name}`.includes(query.q)));
      return { ...page(items), totalCount: items.length };
    }
    case 'getKnowledgeMap': {
      const items = sharedRecords(d).filter(r => !query.placeId || r.place?.id === query.placeId).map(r => ({
        recordId: r.id, personId: r.person.id, placeId: r.place?.id ?? null,
        coordinates: r.place?.coordinates ?? [136.9638, 35.1668], mediaId: null }));
      return { data: { items, totalCount: items.length } };
    }
    case 'getKnowledgeTopics': return { items: [{ topicKey: 'rest', purposes: ['休憩', '散歩'] }] };
    case 'getDiscoveryFacts': return { items: [{ factKey: crypto.randomUUID(),
      text: '形や色、歩くときの感じ方を観察できます。', conceptIds: [],
      source: { url: null, title: '街の観察', claimScope: 'general', sourceId: null },
      anchor: { kind: query.kind, targetId: query.targetId } }], nextCursor: null };
    case 'getDiscoveryCards': return page(d.cards.filter(c => !query.savedOnly || d.reactions.some(r => r.cardId === c.id && r.reaction === 'saved')));
    case 'getDiscoveryCardsCardId': return { data: d.cards.find(c => c.id === path.cardId) ?? missing() };
    case 'postDiscoveryCards': {
      const previous = d.cards.find(c => c.id === body.id);
      if (previous) return { data: previous };
      const assistant = d.messages.find(m => m.id === body.assistantMessageId);
      const user = assistant ? d.messages.find(m => m.conversationId === assistant.conversationId && m.position === assistant.position - 1) : undefined;
      const card = { id: body.id, personId: owner, anchor: user?.context?.anchor ?? { kind: 'place', targetId: ids.cafe, features: ['気づき'] },
        bridge: '見慣れた場所でも、視点を変えると違う発見があります。',
        knowledge: '形・色・音などを観察してみましょう。',
        observationPrompt: '次に訪れたとき、どこが気になるか見てみましょう。', conceptIds: [],
        sources: [{ url: null, title: '街の観察', claimScope: 'general', sourceId: null }],
        sourceRefs: user?.expectedRefs ?? [], version: 1, createdAt: now(), updatedAt: now() };
      d.cards.push(card); save(); return { data: card };
    }
    case 'postDiscoveryCardsCardIdReactions': {
      const reaction = { id: body.id, personId: owner, cardId: path.cardId, reaction: body.reaction, createdAt: now() };
      d.reactions.push(reaction); save(); return { data: reaction };
    }
    case 'listTransferRecipes': return { data: { items: d.recipes } };
    case 'getTransferRecipe': return { data: d.recipes.find(r => r.id === path.recipeId) ?? missing() };
    case 'createTransferRecipe': {
      const recipe = { ...body, version: 1, createdAt: now(), updatedAt: now() };
      d.recipes.push(recipe); save(); return { data: recipe };
    }
    case 'replaceTransferRecipe': {
      const recipe = d.recipes.find(r => r.id === path.recipeId) ?? missing();
      Object.assign(recipe, body, { version: recipe.version + 1, updatedAt: now() }); save(); return { data: recipe };
    }
    case 'listTransferPlanSets': return { data: { items: d.planSets } };
    case 'getTransferPlanSet': return { data: d.planSets.find(p => p.id === path.planSetId) ?? missing() };
    case 'createTransferPlanSet': {
      const recipe = d.recipes.find(r => r.id === body.recipeId) ?? missing();
      const steps = recipe.steps.map((step: Item, index: number) => ({ stepId: step.id,
        placeId: d.places[index % d.places.length]?.id ?? null,
        explanation: `${step.meaning}に合いそうな候補です。営業条件は未確認です。`,
        evidenceIds: step.sourceRecordIds }));
      const conditions = recipe.requiredConditions.map((condition: string) => ({ condition,
        status: 'unknown', explanation: '営業時間などの実条件は未確認です。', evidenceIds: [] }));
      const plans = (['faithful', 'personalized'] as const).map((variant, index) => ({ variant, steps,
        explanation: index ? '本山周辺で好みに合わせた案です。'
          : '本山周辺で元の体験の順番を保つ案です。',
        conditionChecks: conditions, unmetConditions: [], unknowns: ['入力地域の場所検索は行っていません。候補地点は名古屋にあります。実際の移動経路・営業状況は未確認です。'],
        route: { id: crypto.randomUUID(), durationSeconds: index ? 1800 : 1500, distanceMeters: index ? 1800 : 1300,
          expiresAt: now() + 86400000, sourceRefs: [] }, travelMinutes: index ? 30 : 25,
        stayMinutes: recipe.steps.reduce((sum: number, step: Item) => sum + step.stayMinutes, 0),
        totalMinutes: (index ? 30 : 25) + recipe.steps.reduce((sum: number, step: Item) => sum + step.stayMinutes, 0),
        eligible: true }));
      const planSet = { ...body, recipe, sourceRefs: recipe.sourceRefs,
        candidates: d.places.map((place, index) => ({ placeId: place.id, version: place.version, name: place.name,
          position: { longitude: place.coordinates[0], latitude: place.coordinates[1] },
          stepIds: recipe.steps.filter((_: Item, i: number) => i % d.places.length === index).map((s: Item) => s.id) })),
        generatorVersion: 'demo-example', status: 'complete', assistantMessageId: null, assistantAttempt: null,
        plans, commonalities: ['どちらも元の体験の意味を手がかりにしています。'],
        differences: ['立ち寄る順番と移動時間が異なります。'], selectedVariant: null,
        savedRouteId: null, error: null, version: 1, createdAt: now(), updatedAt: now() };
      d.planSets.push(planSet); save(); return { data: planSet };
    }
    case 'adoptTransferPlan': {
      const planSet = d.planSets.find(p => p.id === path.planSetId) ?? missing();
      const plan = planSet.plans.find((p: Item) => p.variant === body.variant) ?? missing();
      const destination = d.places.find(p => p.id === plan.steps.at(-1)?.placeId) ?? d.places[0] ?? missing();
      const routeId = crypto.randomUUID(), start = [planSet.start.longitude, planSet.start.latitude];
      const geometry = { type: 'LineString', coordinates: [start, destination.coordinates] };
      d.routes.push({ id: routeId, version: 1, createdAt: now(), updatedAt: now(), personId: owner,
        title: `${planSet.region}の体験移転`, status: 'saved', currentLeg: 0,
        visibility: 'private', sharedWith: [], waypoints: [{ coordinates: start, name: '出発点', placeId: null },
          { coordinates: destination.coordinates, name: destination.name, placeId: destination.id }],
        mode: planSet.mode, geometry, legs: [{ fromIndex: 0, toIndex: 1, geometry,
          distanceM: plan.route.distanceMeters, durationSec: plan.route.durationSeconds,
          steps: [{ geometry, distanceM: plan.route.distanceMeters, durationSec: plan.route.durationSeconds,
            location: start, type: 'turn', modifier: 'straight', instruction: '道路条件は未確認です。', name: '経路' }] }],
        distanceM: plan.route.distanceMeters, durationSec: plan.route.durationSeconds,
        provider: 'mapbox-directions', fetchedAt: now(), expiresAt: now() + 86400000,
        retention: 'storable', requestedConditions: {}, conditionEvaluations: [] });
      Object.assign(planSet, { status: 'adopted', selectedVariant: body.variant, savedRouteId: routeId,
        version: planSet.version + 1, updatedAt: now() }); save(); return { data: planSet };
    }
    case 'getSharedRecordsRecordId': return { data: sharedRecords(d).find(r => r.id === path.recordId) ?? missing() };
    case 'getInsightsInsightId': {
      const run = d.runs.find(r => r.insightId === path.insightId) ?? missing();
      return { data: { id: path.insightId, version: 1, createdAt: run.createdAt, updatedAt: run.updatedAt,
        personId: owner, kind: 'comparison', inputKey: 'demo-comparison', sourceRefs: run.sourceRefs,
        rangeStart: null, rangeEnd: null, timeZone: 'Asia/Tokyo', generatorVersion: 'demo-example', model: null,
        summary: '二人の記録から比較しました。',
        result: { common: ['落ち着ける場所を大切にしている'],
          differences: ['選んだ場所と過ごし方が異なります'], unknown: ['本人の本当の好みは未確認です。'] },
        review: null, reviewNote: null, reviewedAt: null } };
    }
    case 'getSharedRecordsMap': {
      const records: Item[] = query.audience === 'own' ? d.records.map(r => ({ ...r, person: { id: owner } })) : sharedRecords(d);
      const items = records.filter(r => r.placeId || r.place?.id).map(r => {
        const place = d.places.find(p => p.id === (r.placeId ?? r.place?.id));
        return { recordId: r.id, personId: r.person.id, placeId: place?.id ?? null,
          coordinates: place?.coordinates ?? [136.9638, 35.1668], mediaId: null };
      });
      return { data: { items, totalCount: items.length } };
    }
    case 'getPlaceCandidates': return { data: { resultId: crypto.randomUUID(), expiresAt: now() + 86400000,
      items: d.places.filter(p => !query.category || p.categories.includes(query.category)).map(p => ({
        candidateId: p.id, placeId: p.id, name: p.name, address: p.address,
        position: { longitude: p.coordinates[0], latitude: p.coordinates[1] }, categories: p.categories,
        provider: 'demo', externalId: null, buildingKey: null, sourceUrl: null, attribution: '',
        fetchedAt: null, retention: 'storable',
      })) } };
    case 'getPlacesPlaceId': { const p = d.places.find(p => p.id === path.placeId); return p ? { data: detail(p, owner, d.records) } : undefined; }
    case 'getRecords': {
      const theme = d.themes.find(t => t.id === query.themeId);
      return page(d.records.filter(r => (!query.kind || r.kind === query.kind) && (!query.placeId || r.placeId === query.placeId)
        && (!query.themeId || theme?.recordIds.includes(r.id)) && (!query.from || r.effectiveStartedAt === null || r.effectiveStartedAt >= query.from)
        && (!query.to || r.effectiveStartedAt === null || r.effectiveStartedAt < query.to)).slice(0, query.limit ?? 100));
    }
    case 'getRecordsRecordId': { const r = d.records.find(r => r.id === path.recordId); return { data: { record: r ?? missing(), media: { status: 'ready', data: page(d.media[path.recordId ?? ''] ?? []) } } }; }
    case 'getRecordsRecordIdMedia': return page(d.media[path.recordId ?? ''] ?? []);
    case 'getMediaMediaId': return { data: Object.values(d.media).flat().find(m => m.id === path.mediaId) ?? missing() };
    case 'postRecordsRecordIdMedia': {
      const record = d.records.find(r => r.id === path.recordId) ?? missing();
      const form = input.body as FormData;
      const file = form.get('file');
      if (!(file instanceof File)) return missing();
      return fileDataUrl(file).then(contentUrl => {
        const media = { id: String(form.get('id') ?? crypto.randomUUID()), version: 1, createdAt: now(), updatedAt: now(),
          recordId: record.id, kind: file.type.startsWith('video/') ? 'video' : 'photo', mimeType: file.type,
          byteSize: file.size, position: Number(form.get('position') ?? 0), status: 'ready', contentUrl };
        const mediaList = d.media[record.id] ?? (d.media[record.id] = []); mediaList.push(media);
        record.version++; record.updatedAt = now(); save(); return { data: media };
      });
    }
    case 'postRecordsRecordIdMediaReorder': {
      const record = d.records.find(r => r.id === path.recordId) ?? missing();
      const items = d.media[record.id] ?? [];
      body.items?.forEach((ordered: Item, index: number) => { const media = items.find(m => m.id === ordered.id); if (media) media.position = index; });
      record.version++; record.updatedAt = now(); save(); return page(items.sort((a, b) => a.position - b.position));
    }
    case 'deleteMediaMediaId': {
      d.deletedMediaIds.push(path.mediaId ?? '');
      for (const record of d.records) {
        const before = d.media[record.id] ?? [];
        if (before.some(m => m.id === path.mediaId)) { d.media[record.id] = before.filter(m => m.id !== path.mediaId); record.version++; save(); break; }
      }
      return { data: { deleted: true } };
    }
    case 'getMediaMediaIdContent': {
      const mediaId = path.mediaId ?? '';
      const uploaded = Object.values(d.media).flat().find(m => m.id === mediaId);
      if (uploaded) return fetch(uploaded.contentUrl, { signal: input.signal }).then(response => response.blob());
      const isPark = mediaId.includes('000000000042') || mediaId.includes(ids.parkRecord);
      const known = mediaId.includes('00000000004') || mediaId.startsWith('friend-photo-') || mediaId.endsWith('-photo');
      return known ? fetch(isPark ? park : coffee, { signal: input.signal }).then(response => response.blob()) : missing();
    }
    case 'postRecords': {
      const linkedVisit = d.visits.find(v => v.id === body.visitId);
      const r = { ...body, version: 1, personId: owner, createdAt: now(), updatedAt: now(),
        effectivePlaceId: linkedVisit?.placeId ?? body.placeId ?? null,
        effectiveStartedAt: linkedVisit?.startedAt ?? body.occurredAt ?? null,
        effectiveEndedAt: linkedVisit?.endedAt ?? body.endedAt ?? null,
        effectiveTimePrecision: linkedVisit?.timePrecision ?? body.timePrecision ?? 'unknown', memo: body.memo ?? null };
      d.records.unshift(r); save(); return { data: r };
    }
    case 'patchRecordsRecordId': {
      const r = d.records.find(r => r.id === path.recordId) ?? missing();
      Object.assign(r, body, { version: r.version + 1, updatedAt: now() });
      r.effectivePlaceId = r.placeId; r.effectiveStartedAt = r.occurredAt; save(); return { data: r };
    }
    case 'deleteRecordsRecordId': d.deletedRecordIds.push(path.recordId ?? ''); d.records = d.records.filter(r => r.id !== path.recordId); save(); return { data: { deleted: true } };
    case 'getThemes': return page(d.themes);
    case 'getThemesThemeId': return { data: d.themes.find(t => t.id === path.themeId) ?? missing() };
    case 'postThemes': { const t = { ...body, version: 1, personId: owner, createdAt: now(), updatedAt: now() }; d.themes.push(t); save(); return { data: t }; }
    case 'patchThemesThemeId': { const t = d.themes.find(t => t.id === path.themeId) ?? missing(); Object.assign(t, body, { version: t.version + 1, updatedAt: now() }); save(); return { data: t }; }
    case 'deleteThemesThemeId': d.themes = d.themes.filter(t => t.id !== path.themeId); save(); return { data: { deleted: true } };
    case 'getSelfCheckins': return page(d.checkins.filter(c => !query.date || c.localDate === query.date));
    case 'getSelfCheckinsCheckinId': return { data: d.checkins.find(c => c.id === path.checkinId) ?? missing() };
    case 'postSelfCheckins': { const c = { ...body, version: 1, personId: owner, createdAt: now(), updatedAt: now() }; d.checkins.push(c); save(); return { data: c }; }
    case 'patchSelfCheckinsCheckinId': { const c = d.checkins.find(c => c.id === path.checkinId) ?? missing(); Object.assign(c, body, { version: c.version + 1, updatedAt: now() }); save(); return { data: c }; }
    case 'postSuggestionBatches': {
      const expiresAt = Math.max(body.expiresAt ?? 0, now() + 86400000);
      const items = [ids.cafe, ids.park].map((placeId, position) => ({
        id: position ? ids.suggestionPark : ids.suggestionCafe, version: 1, createdAt: now(), updatedAt: now(), personId: owner,
        placeId, batchId: body.id, position, title: position ? '緑の中を散歩' : '静かなカフェで休む',
        activity: position ? '散歩' : 'カフェ', reason: '希望に合いそうな場所です。',
        conditions: body.conditions, checkinId: body.checkin?.id ?? null, sourceRefs: [], status: 'offered', presentedAt: null,
        selectedAt: null, expiresAt, routeId: null, completedVisitId: null, feedback: '', travelMinutes: position ? 14 : 8,
        stayMinutes: 20, totalMinutes: position ? 34 : 28, matchedWishes: body.conditions?.wishes ?? [], unknowns: ['実際の営業・経路は未確認です。'],
        viewedAt: null,
      }));
      d.suggestions = [...items, ...d.suggestions.filter(s => !items.some(i => i.id === s.id))];
      d.batches.push({ id: body.id, items, expiresAt, conditions: body.conditions }); save();
      return { data: { id: body.id, items, expiresAt, conditions: body.conditions } };
    }
    case 'getSuggestions': return { ...page(d.suggestions.filter(s => !query.batchId || s.batchId === query.batchId)), emptyReason: null };
    case 'getSuggestionsSuggestionId': return { data: d.suggestions.find(s => s.id === path.suggestionId) ?? missing() };
    case 'patchSuggestionsSuggestionId': {
      const s = d.suggestions.find(s => s.id === path.suggestionId) ?? missing();
      Object.assign(s, body, { version: s.version + 1, updatedAt: now() }); if (body.viewed) s.viewedAt = now();
      if (body.status === 'selected') s.selectedAt = now(); save(); return { data: s };
    }
    case 'getBookmarks': return page(d.bookmarks);
    case 'postReflectionComparisons': {
      const comparison = { ...body, personId: owner, version: 1, createdAt: now(), updatedAt: now() };
      d.comparisons.push(comparison); save(); return { data: comparison };
    }
    case 'getReflectionComparisonsComparisonId': return { data: d.comparisons.find(c => c.id === path.comparisonId) ?? missing() };
    case 'patchReflectionComparisonsComparisonId': {
      const comparison = d.comparisons.find(c => c.id === path.comparisonId) ?? missing();
      Object.assign(comparison, body, { version: comparison.version + 1, updatedAt: now() }); save(); return { data: comparison };
    }
    case 'getReflectionQuestions': return page(d.questions.filter(q => (!query.targetRecordId || q.targetRecordId === query.targetRecordId)
      && (!query.status || q.status === query.status)));
    case 'getReflectionQuestionsQuestionId': return { data: d.questions.find(q => q.id === path.questionId) ?? missing() };
    case 'postReflectionQuestions': {
      const existing = d.questions.find(q => q.assistantMessageId === body.assistantMessageId);
      if (existing) return { data: existing };
      const run = d.runs.find(r => r.id === body.assistantMessageId) ?? missing();
      const source = d.messages.find(m => m.id === run.userMessageId);
      const q = { id: crypto.randomUUID(), personId: owner, targetRecordId: source?.context?.recordId ?? ids.coffeeRecord,
        topic: 'reason', questionText: run.result?.question?.text ?? 'その場所で、どんな気持ちになりましたか？',
        sourceRefs: source?.expectedRefs ?? [], generatorVersion: 'demo-example', status: 'pending', answerRecordId: null,
        version: 1, createdAt: now(), updatedAt: now(), answerText: null, answerVersion: null,
        answerRef: null, answerUnavailable: false, evidenceState: 'current', assistantMessageId: body.assistantMessageId };
      d.questions.push(q); save(); return { data: q };
    }
    case 'patchReflectionQuestionsQuestionId': {
      const q = d.questions.find(q => q.id === path.questionId) ?? missing();
      Object.assign(q, body, { version: q.version + 1, updatedAt: now() });
      if (body.answerText) { q.answerVersion = (q.answerVersion ?? 0) + 1; q.answerRef = { type: 'record', id: q.targetRecordId, version: 1 }; }
      save(); return { data: q };
    }
    case 'postReflectionAdoptions': {
      const run = d.runs.find(r => r.id === body.assistantMessageId) ?? missing();
      const target = d.records.find(r => r.id === body.recordId) ?? missing();
      if (body.body !== undefined) target.body = body.body;
      if (run.task === 'extract' && run.result) target.impression = run.result.reason ?? target.impression;
      target.version++; target.updatedAt = now(); save(); return { data: target };
    }
    case 'getBookmarksBookmarkId': return { data: d.bookmarks.find(b => b.id === path.bookmarkId) ?? missing() };
    case 'postBookmarks': { const b = { ...body, version: 1, personId: owner, createdAt: now(), updatedAt: now() }; d.bookmarks.push(b); save(); return { data: b }; }
    case 'deleteBookmarksBookmarkId': d.bookmarks = d.bookmarks.filter(b => b.id !== path.bookmarkId); save(); return { data: { deleted: true } };
    case 'postRouteComparisons': {
      const waypoints = (body.waypoints ?? []).map((point: Item, index: number) => {
        const stored = d.places.find(p => p.id === point.placeId);
        const coordinates = point.coordinates ?? stored?.coordinates ?? (index ? d.places[0]?.coordinates ?? [136.9638, 35.1668] : [136.9638, 35.1635]);
        return { coordinates, name: point.label ?? stored?.name ?? (index ? '目的地' : '現在地'), placeId: stored?.id ?? null };
      });
      if (waypoints.length < 2) return { data: { items: [] } };
      const coordinates = waypoints.map((w: Item) => w.coordinates);
      const geometry = { type: 'LineString', coordinates };
      const results = [0, 1].map(index => ({
        resultId: crypto.randomUUID(), waypoints, mode: body.mode ?? 'walking',
        legs: [{ fromIndex: 0, toIndex: waypoints.length - 1, geometry, distanceM: index ? 1500 : 1200,
          durationSec: index ? 1500 : 1080, steps: [{ geometry, distanceM: 1200, durationSec: 1080,
            location: coordinates[0], type: 'turn', modifier: 'left', instruction: '道路条件は未確認です。', name: '道順' }] }],
        geometry, distanceM: index ? 1500 : 1200, durationSec: index ? 1500 : 1080,
        provider: 'mapbox-directions', fetchedAt: now(), expiresAt: now() + 86400000,
        retention: 'storable', requestedConditions: body.conditions ?? {},
        conditionEvaluations: index ? [{ key: 'route', status: 'unknown', reason: '実際の道路条件は未確認です。', hard: false }] : [],
      }));
      d.routeResults.push(...results); save(); return { data: { items: results } };
    }
    case 'postSavedRoutes': {
      const result = d.routeResults.find(r => r.resultId === body.resultId) ?? missing();
      const route = { ...result, id: body.id, personId: owner, title: body.title || '保存した経路',
        sourceUrl: null, fetchedAt: now(), status: 'saved', currentLeg: 0,
        visibility: 'private', sharedWith: [], version: 1, createdAt: now(), updatedAt: now() };
      d.routes.push(route); save(); return { data: route };
    }
    case 'getSavedRoutes': return page(d.routes);
    case 'getSavedRoutesRouteId': return { data: d.routes.find(r => r.id === path.routeId) ?? missing() };
    case 'patchSavedRoutesRouteId': {
      const route = d.routes.find(r => r.id === path.routeId) ?? missing();
      Object.assign(route, body, { version: route.version + 1, updatedAt: now() }); save(); return { data: route };
    }
    case 'postMapDialogues': {
      const places = d.places.map(p => ({ candidateId: p.id, placeId: p.id, name: p.name, address: p.address,
        coordinates: p.coordinates, categories: p.categories, provider: 'demo', externalId: null,
        buildingKey: null, sourceUrl: null, attribution: '', fetchedAt: null, retention: 'storable' }));
      const result = { resultId: crypto.randomUUID(), text: body.text,
        places, routes: [], origin: body.origin, expiresAt: now() + 86400000 };
      d.dialogues.push(result); save(); return { data: result };
    }
    case 'getMapDialoguesResultsResultId': return { data: d.dialogues.find(r => r.resultId === path.resultId) ?? missing() };
    case 'postMapDialoguesSelect': {
      const result = d.dialogues.find(r => r.resultId === body.resultId) ?? missing();
      return { data: { ...result, places: result.places.filter((p: Item) => p.candidateId === body.candidateId) } };
    }
    case 'postConversations': {
      const c = { ...body, version: 1, personId: owner, createdAt: now(), updatedAt: now() };
      d.conversations.push(c); save(); return { data: c };
    }
    case 'getConversations': return page(d.conversations.filter(c => !query.purpose || c.purpose === query.purpose));
    case 'getConversationsConversationIdMessages': return page(d.messages.filter(m => m.conversationId === path.conversationId));
    case 'postConversationsConversationIdMessages': {
      const text = body.body || '相談を始める';
      const user = { id: body.userMessageId, version: 1, createdAt: now(), updatedAt: now(),
        conversationId: path.conversationId, position: d.messages.length, role: 'user', body: text,
        status: 'complete', attempt: 1, model: null, errorCode: null, insightId: null, sourceRefs: [],
        context: body.context ?? null, expectedRefs: body.expectedRefs ?? [] };
      const assistant = { ...user, id: body.assistantMessageId, position: user.position + 1,
        role: 'assistant', body: body.use === 'discovery' ? '見つけた特徴から、新しい見方をひらきます。'
          : '静かなカフェと緑の多い公園を見つけました。候補を選んで詳しく見られます。' };
      d.messages.push(user, assistant); save(); return { data: { userMessage: user, assistantMessage: assistant } };
    }
    case 'getMessagesMessageId': {
      const message = d.messages.find(m => m.id === path.messageId) ?? missing();
      let run = d.runs.find(r => r.id === message.id) ?? null;
      if (!run && message.role === 'assistant') {
        const user = d.messages.find(m => m.conversationId === message.conversationId && m.position === message.position - 1);
        const use = user?.context?.recordId ? 'extract' : user?.context?.date ? 'diary'
          : user?.context?.fromRecordIds ? 'compare' : null;
        if (use) {
          const sourceRecord = d.records.find(r => r.id === user?.context?.recordId);
          const result = use === 'compare' ? { mappings: [{ fromRecordId: user?.context?.fromRecordIds?.[0],
              toRecordId: user?.context?.toRecordIds?.[0], relation: 'different-place-same-role',
              explanation: 'どちらも気分を落ち着ける場所として使っています。',
              evidenceIds: [user?.context?.fromRecordIds?.[0], user?.context?.toRecordIds?.[0]], rejected: false }] }
            : use === 'diary' ? { text: 'カフェでひと息つき、公園を散歩しました。', evidenceIds: user?.context?.recordIds ?? [] }
            : { purpose: sourceRecord?.purposes?.[0] ?? '休憩', reason: sourceRecord?.impression ?? '心地よかった',
              context: { weather: null, companion: null, timeBudgetMinutes: null, timeBand: null, notes: null },
              evidenceIds: [user?.context?.recordId], question: { topic: 'reason', text: 'その場所で、どんな気持ちになりましたか？' } };
          run = { id: message.id, conversationId: message.conversationId, userMessageId: user?.id, task: use,
            status: 'complete', attempt: 1, version: 1, model: 'demo-example', promptVersion: 'demo', error: null,
            sourceRefs: user?.expectedRefs ?? [], insightId: use === 'compare' ? `insight-${message.id}` : null,
            createdAt: now(), updatedAt: now(), result };
          d.runs.push(run); save();
        }
      }
      if (run?.task === 'compare' && !run.insightId) { run.insightId = `insight-${message.id}`; save(); }
      const user = d.messages.find(m => m.conversationId === message.conversationId && m.position === message.position - 1);
      const discovery = message.role === 'assistant' && !!user?.context?.anchor;
      return { data: { message, run, output: discovery ? { use: 'discovery', value: {
        anchor: user.context.anchor, bridge: 'いつもの場所を違う角度から見てみましょう。',
        knowledge: '形や色を観察してみましょう。', observationPrompt: '何に気づきましたか？',
        conceptIds: [], sources: [{ url: null, title: '街の観察', claimScope: 'general', sourceId: null }] } } : null, appliedRefs: [] } };
    }
    case 'postMapDialoguesResultsResultIdHistory': {
      d.conversationResults[body.conversationId] = path.resultId ?? ''; save();
      const result = d.dialogues.find(r => r.resultId === path.resultId) ?? null;
      return { data: { conversationId: body.conversationId, resultId: path.resultId, result,
        expiresAt: result?.expiresAt ?? null, resumeAction: 'continue' } };
    }
    case 'getConversationsConversationIdMapDialogue': {
      const resultId = d.conversationResults[path.conversationId ?? ''];
      const result = d.dialogues.find(r => r.resultId === resultId) ?? null;
      return { data: { conversationId: path.conversationId, resultId: result?.resultId ?? null, result,
        expiresAt: result?.expiresAt ?? null, resumeAction: result ? 'continue' : 'search' } };
    }
    default: return undefined;
  }
}
