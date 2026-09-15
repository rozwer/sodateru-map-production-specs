import { useEffect, useRef, useState } from 'react';
import type { RecordView, TransferPlanInput, TransferPlanSet, TransferRecipe, TransferRecipeInput } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { useMapBridge } from '../../app/useMapBridge';
import { newId } from '../exploration/api';
import { useExplorationFlow, useScreenRequest } from '../exploration/screen-support';
import { TransferPlanComparison, TransferRecipeForm } from './live-views';
import { transferMessages as m } from './views';

function recipeInput(recipe: TransferRecipeInput): TransferRecipeInput {
  return { id: recipe.id, title: recipe.title.trim(), meaning: recipe.meaning.trim(), sourceRefs: recipe.sourceRefs, steps: recipe.steps.map(step => ({ id: step.id, meaning: step.meaning.trim(), sourceRecordIds: step.sourceRecordIds, stayMinutes: step.stayMinutes, required: step.required })), requiredConditions: recipe.requiredConditions.map(text => text.trim()).filter(Boolean), allowedChanges: recipe.allowedChanges.map(text => text.trim()).filter(Boolean) };
}
function freshRecipe(): TransferRecipeInput {
  return { id: newId(), title: '', meaning: '', sourceRefs: [], steps: [{ id: newId(), meaning: '', sourceRecordIds: [], stayMinutes: 30, required: true }], requiredConditions: [], allowedChanges: [] };
}
type TransferState = {
  recipe: TransferRecipeInput; savedRecipe: TransferRecipe | null;
  region: string; preferences: string; start: { longitude: number; latitude: number }; mode: 'walking' | 'driving'; timeBudgetMinutes: number;
  planSet: TransferPlanSet | null; selected: 'faithful' | 'personalized'; notice: string | null;
};

function TransferScreen({ route, navigate, active = true }: ScreenProps) {
  const bridge = useMapBridge();
  const { flow } = useExplorationFlow();
  const [state, setState] = useScreenState<TransferState>(() => {
    const camera = bridge.getSnapshot().camera;
    return { recipe: freshRecipe(), savedRecipe: null, region: '', preferences: '', start: { longitude: camera.longitude, latitude: camera.latitude }, mode: 'walking', timeBudgetMinutes: 180, planSet: null, selected: 'faithful', notice: null };
  });
  const [records, setRecords] = useState<RecordView[]>([]);
  const [recipes, setRecipes] = useState<TransferRecipe[]>([]);
  const [planSets, setPlanSets] = useState<TransferPlanSet[]>([]);
  const request = useScreenRequest(active);
  const attempt = useRef<{ signature: string; input: TransferPlanInput } | null>(null);
  const adoptAttempt = useRef<{ planId: string; version: number; variant: 'faithful' | 'personalized'; id: string } | null>(null);
  const lastAction = useRef<() => void>(() => {});
  const change = (patch: Partial<TransferState>) => setState(previous => ({ ...previous, ...patch }));
  const dirty = !state.savedRecipe || JSON.stringify(recipeInput(state.recipe)) !== JSON.stringify(recipeInput(state.savedRecipe));

  const needsComparison = dirty || Boolean(state.planSet && (state.savedRecipe?.version !== state.planSet.recipeVersion || state.region.trim() !== state.planSet.region || state.preferences !== state.planSet.preferences || state.mode !== state.planSet.mode || state.timeBudgetMinutes !== state.planSet.timeBudgetMinutes || JSON.stringify(state.start) !== JSON.stringify(state.planSet.start)));

  const load = () => request.run(async signal => {
    const [recordPage, recipePage, plans] = await Promise.all([
      api.request('getRecords', { query: { kind: 'experience', limit: 100 }, signal }),
      api.request('listTransferRecipes', { signal }), api.request('listTransferPlanSets', { signal }),
    ]);
    const items = recordPage.items;
    if (route.params.recordId && !items.some(record => record.id === route.params.recordId)) items.push((await api.request('getRecordsRecordId', { path: { recordId: route.params.recordId }, signal })).data.record);
    return { records: items, recipes: recipePage.data.items, plans: plans.data.items };
  }, value => {
    setRecords(value.records); setRecipes(value.recipes); setPlanSets(value.plans);
    const record = value.records.find(record => record.id === route.params.recordId);
    if (record && !state.recipe.sourceRefs.length) change({ recipe: { ...state.recipe, title: state.recipe.title || record.body.slice(0, 80), sourceRefs: [{ type: 'record', id: record.id, version: record.version }], steps: state.recipe.steps.map((step, index) => index === 0 ? { ...step, sourceRecordIds: [record.id] } : step) } });
  });
  useEffect(() => { if (active) { lastAction.current = () => void load(); void load(); } }, [active]);

  const installPlan = (planSet: TransferPlanSet) => change({ planSet, recipe: recipeInput(planSet.recipe), savedRecipe: planSet.recipe, region: planSet.region, preferences: planSet.preferences, start: planSet.start, mode: planSet.mode, timeBudgetMinutes: planSet.timeBudgetMinutes, selected: planSet.selectedVariant ?? 'faithful', notice: null });
  const reopen = (kind: 'recipe' | 'plan', id: string) => {
    lastAction.current = () => reopen(kind, id);
    if (kind === 'recipe') void request.run(signal => api.request('getTransferRecipe', { path: { recipeId: id }, signal }), ({ data }) => change({ recipe: recipeInput(data), savedRecipe: data, planSet: null, notice: null }));
    else void request.run(signal => api.request('getTransferPlanSet', { path: { planSetId: id }, signal }), ({ data }) => installPlan(data));
  };
  useEffect(() => { if (active && route.params.planSetId && route.params.planSetId !== state.planSet?.id) reopen('plan', route.params.planSetId); else if (active && route.params.recipeId && route.params.recipeId !== state.savedRecipe?.id) reopen('recipe', route.params.recipeId); }, [active, route.params.planSetId, route.params.recipeId]);
  useEffect(() => {
    if (!active || !state.planSet || !['pending', 'running'].includes(state.planSet.status)) return;
    const controller = new AbortController(), id = state.planSet.id;
    const timer = setTimeout(() => { void api.request('getTransferPlanSet', { path: { planSetId: id }, signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) { change({ planSet: data }); setPlanSets(previous => [data, ...previous.filter(item => item.id !== id)]); } }).catch(error => { if (!controller.signal.aborted) request.setError(error instanceof Error ? error.message : '案の取得に失敗しました。'); }); }, 1500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [active, state.planSet]);

  const editRecipe = (recipe: TransferRecipeInput) => {
    const sourceIds = [...new Set(recipe.steps.flatMap(step => step.sourceRecordIds))];
    const sourceRefs = sourceIds.map(id => state.recipe.sourceRefs.find(ref => ref.type === 'record' && ref.id === id) ?? (() => { const record = records.find(record => record.id === id); return record ? { type: 'record' as const, id, version: record.version } : null; })()).filter((ref): ref is TransferRecipeInput['sourceRefs'][number] => ref !== null);
    change({ recipe: { ...recipe, sourceRefs }, notice: null });
  };
  const persist = async (signal: AbortSignal): Promise<TransferRecipe> => {
    const body = recipeInput(state.recipe);
    if (!body.title || !body.meaning || body.steps.some(step => !step.meaning || !step.sourceRecordIds.length)) throw new Error('レシピ名、体験全体の意味、各段階の元記録と意味を入力してください。');
    if (!dirty && state.savedRecipe) return state.savedRecipe;
    return state.savedRecipe ? (await api.request('replaceTransferRecipe', { path: { recipeId: body.id }, body, version: state.savedRecipe.version, signal })).data : (await api.request('createTransferRecipe', { body, idempotencyKey: body.id, signal })).data;
  };
  const acceptRecipe = (recipe: TransferRecipe) => { change({ recipe: recipeInput(recipe), savedRecipe: recipe, notice: 'レシピを保存しました。元の記録はそのままです。' }); setRecipes(previous => [recipe, ...previous.filter(item => item.id !== recipe.id)]); };
  const save = () => { lastAction.current = save; void request.run(persist, acceptRecipe); };

  const generate = async (recipe: TransferRecipe, preferences: string, start = state.start, parentSignal?: AbortSignal) => {
    const input = { recipeId: recipe.id, recipeVersion: recipe.version, region: state.region.trim(), start, mode: state.mode, timeBudgetMinutes: state.timeBudgetMinutes, preferences };
    const signature = JSON.stringify(input);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, input: { ...input, id: newId() } };
    const operation = attempt.current;
    await request.run(signal => api.request('createTransferPlanSet', { body: operation.input, idempotencyKey: operation.input.id, signal }), ({ data }) => {
      change({ planSet: data, preferences, start, selected: 'faithful', notice: 'この比較は「保存したレシピ・後で見る案」から開き直せます。' });
      setPlanSets(previous => [data, ...previous.filter(item => item.id !== data.id)]);
      attempt.current = null;
    }, parentSignal);
  };
  const compare = () => {
    lastAction.current = compare;
    void request.run(async signal => {
      if (!state.region.trim() || !Number.isInteger(state.timeBudgetMinutes) || state.timeBudgetMinutes < 1 || state.timeBudgetMinutes > 1440) throw new Error('次の街と、1〜1440分の時間を入力してください。');
      const recipe = await persist(signal);
      const settings = (await api.request('getMeSettings', { signal })).data;
      return { recipe, settings };
    }, ({ recipe, settings }) => {
      acceptRecipe(recipe);
      if (!settings.ai.enabled || !settings.ai.allowLocation || !settings.ai.allowRecords) {
        flow.setConsent({ text: state.preferences || '元の体験の意味を大切にして、二つの案を比較してください。', textLimit: 4000, place: null, origin: { coordinates: [state.start.longitude, state.start.latitude], kind: 'selected', label: `${state.region}での起点` }, returnPage: 'experience-transfer', settings, recordsRequired: true, sourceSummary: [recipe.title, recipe.meaning, ...recipe.steps.map(step => step.meaning)], cancel: confirmed => change({ preferences: confirmed.text }), send: async (confirmed, signal) => { const start = confirmed.origin ? { longitude: confirmed.origin.coordinates[0], latitude: confirmed.origin.coordinates[1] } : state.start; await generate(recipe, confirmed.text, start, signal); } });
        navigate('ai-consent');
      } else void generate(recipe, state.preferences);
    });
  };
  const adopt = () => {
    const planSet = state.planSet, plan = planSet?.plans.find(plan => plan.variant === state.selected);
    if (!planSet || !plan?.eligible || planSet.status !== 'complete' || needsComparison || !plan.route || plan.route.expiresAt <= Date.now()) { request.setError('条件と案の期限を確かめて、もう一度比較してください。'); return; }
    lastAction.current = adopt;
    if (adoptAttempt.current?.planId !== planSet.id || adoptAttempt.current?.version !== planSet.version || adoptAttempt.current?.variant !== state.selected) adoptAttempt.current = { planId: planSet.id, version: planSet.version, variant: state.selected, id: newId() };
    const operation = adoptAttempt.current;
    void request.run(signal => api.request('adoptTransferPlan', { path: { planSetId: planSet.id }, body: { variant: state.selected }, version: planSet.version, idempotencyKey: operation.id, signal }), ({ data }) => {
      change({ planSet: data }); adoptAttempt.current = null;
      if (data.savedRouteId) navigate('route-navigation', { routeId: data.savedRouteId });
      else request.setError('採用後の保存経路を確認できません。案を開き直してください。');
    });
  };
  return <section className="transfer-workbench" aria-label={m.title}>
    <header><p>{m.eyebrow}</p><h2>{m.title}</h2><p>{m.description}</p></header>
    {(recipes.length > 0 || planSets.length > 0) && <details><summary>{m.saved}</summary><div className="transfer-saved">{recipes.map(recipe => <button type="button" key={`recipe:${recipe.id}`} disabled={request.busy} onClick={() => reopen('recipe', recipe.id)}>{recipe.title}</button>)}{planSets.map(plan => <button type="button" key={`plan:${plan.id}`} disabled={request.busy} onClick={() => reopen('plan', plan.id)}>{plan.recipe.title} → {plan.region}（{new Date(plan.createdAt).toLocaleDateString('ja-JP')}）</button>)}</div></details>}
    <TransferRecipeForm recipe={state.recipe} records={records} busy={request.busy} dirty={dirty} onChange={editRecipe} onSave={save}/>
    <fieldset disabled={request.busy}><legend>{m.destination}</legend>
      <label>{m.city}<input value={state.region} maxLength={300} onChange={event => change({ region: event.target.value })}/></label>
      <label>今回の希望・費用・営業条件<textarea value={state.preferences} maxLength={4000} placeholder="費用の上限、営業中であること、楽しみたいことなど" onChange={event => change({ preferences: event.target.value })}/></label>
      <p>出発点: 緯度 {state.start.latitude.toFixed(5)}、経度 {state.start.longitude.toFixed(5)}</p><button type="button" onClick={() => { const camera = bridge.getSnapshot().camera; change({ start: { longitude: camera.longitude, latitude: camera.latitude } }); }}>地図の中心を起点にする</button>
      <div className="transfer-grid"><label>{m.time}<input type="number" min={1} max={1440} value={state.timeBudgetMinutes} onChange={event => change({ timeBudgetMinutes: Number(event.target.value) })}/></label><label>移動手段<select value={state.mode} onChange={event => change({ mode: event.target.value as 'walking' | 'driving' })}><option value="walking">徒歩</option><option value="driving">車</option></select></label></div>
      <button type="button" className="transfer-primary" onClick={compare}>{m.compare}</button>
    </fieldset>
    {request.error && <div className="transfer-error" role="alert"><p>{request.error}</p><button type="button" disabled={request.busy} onClick={() => lastAction.current()}>{m.retry}</button>{state.savedRecipe && <button type="button" disabled={request.busy} onClick={() => reopen('recipe', state.savedRecipe!.id)}>保存済みの版を読み直す</button>}</div>}
    {request.busy && <p role="status">{m.processing}</p>}{state.notice && <p role="status" className="transfer-note">{state.notice}</p>}
    {state.planSet && <TransferPlanComparison planSet={state.planSet} selected={state.selected} dirty={needsComparison} busy={request.busy} onSelect={selected => change({ selected })} onAdopt={adopt} onDefer={() => { change({ notice: 'この案を保存済み一覧から後で開けます。' }); navigate('experience-transfer', { planSetId: state.planSet!.id }); }} onReopenRoute={() => { if (state.planSet?.savedRouteId) navigate('route-navigation', { routeId: state.planSet.savedRouteId }); }}/>}
  </section>;
}

export const screens: ScreenDefinition[] = [{ id: 'experience-transfer', title: '別の街で試す', component: TransferScreen, layout: { contentPadding: 'none', header: 'back', background: 'soft', bottomNav: false } }];
