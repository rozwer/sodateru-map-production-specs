import type { RecordView, TransferPlanSet, TransferRecipeInput } from '../../../packages/api-client/index';
import { newId } from '../exploration/api';
import { transferMessages as m } from './views';
import './transfer.css';

export function TransferRecipeForm({ recipe, records, busy, dirty, onChange, onSave }: {
  recipe: TransferRecipeInput; records: RecordView[]; busy: boolean; dirty: boolean;
  onChange: (recipe: TransferRecipeInput) => void; onSave: () => void;
}) {
  const change = (patch: Partial<TransferRecipeInput>) => onChange({ ...recipe, ...patch });
  const step = (id: string, patch: Partial<TransferRecipeInput['steps'][number]>) => change({ steps: recipe.steps.map(step => step.id === id ? { ...step, ...patch } : step) });
  return <fieldset disabled={busy}><legend>{m.source}</legend>
    <label>{m.name}<input value={recipe.title} maxLength={200} onChange={event => change({ title: event.target.value })}/></label>
    <label>体験全体の意味・順番を残したい理由<textarea value={recipe.meaning} maxLength={2000} onChange={event => change({ meaning: event.target.value })}/></label>
    {recipe.steps.map((item, index) => <article className="transfer-role" key={item.id}>
      <h3>{index + 1}. {m.stage}</h3>
      <label>元の記録を追加<select value="" onChange={event => { if (event.target.value) step(item.id, { sourceRecordIds: [...item.sourceRecordIds, event.target.value] }); }}><option value="">{m.select}</option>{records.filter(record => !item.sourceRecordIds.includes(record.id)).map(record => <option key={record.id} value={record.id}>{record.body.slice(0, 80) || '本文のない記録'}</option>)}</select></label>
      {item.sourceRecordIds.map(recordId => { const record = records.find(record => record.id === recordId); return <div className="transfer-source-record" key={recordId}><p>{record?.body ?? '記録を取得できません。保存前に元の記録を確認してください。'}</p><button type="button" onClick={() => step(item.id, { sourceRecordIds: item.sourceRecordIds.filter(id => id !== recordId) })}>この参照を外す</button></div>; })}
      <label>役割・目的・理由・移せない記憶<textarea value={item.meaning} maxLength={2000} placeholder="この段階が大切な理由と、場所が変わっても残したいこと" onChange={event => step(item.id, { meaning: event.target.value })}/></label>
      <div className="transfer-grid"><label>{m.stay}<input type="number" min={0} max={1440} value={item.stayMinutes} onChange={event => step(item.id, { stayMinutes: Number(event.target.value) })}/></label><label className="transfer-choice"><input type="checkbox" checked={item.required} onChange={event => step(item.id, { required: event.target.checked })}/>この段階は必須</label></div>
      <div className="transfer-actions"><button type="button" disabled={index === 0} onClick={() => { const items = [...recipe.steps]; const previous = items[index - 1]; if (!previous) return; items[index - 1] = item; items[index] = previous; change({ steps: items }); }}>{m.previous}</button><button type="button" disabled={recipe.steps.length === 1} onClick={() => change({ steps: recipe.steps.filter(step => step.id !== item.id) })}>{m.remove}</button></div>
    </article>)}
    <button type="button" disabled={recipe.steps.length >= 9} onClick={() => change({ steps: [...recipe.steps, { id: newId(), meaning: '', sourceRecordIds: [], stayMinutes: 30, required: true }] })}>{m.add}</button>
    <label>必須条件（1行に1つ）<textarea value={recipe.requiredConditions.join('\n')} onChange={event => change({ requiredConditions: event.target.value.split('\n') })}/></label>
    <label>変更してよい条件（1行に1つ）<textarea value={recipe.allowedChanges.join('\n')} onChange={event => change({ allowedChanges: event.target.value.split('\n') })}/></label>
    <button type="button" onClick={onSave}>{m.save}</button>{dirty && <p className="transfer-note">{m.draft}</p>}<p className="transfer-note">{m.originalUnchanged}</p>
  </fieldset>;
}

const statusText: Record<TransferPlanSet['status'], string> = { pending: '作成を待っています', running: '二つの案を作っています', complete: '比較できます', incomplete: '条件を満たす案が揃っていません', failed: '案を作成できませんでした', cancelled: '作成を取り消しました', adopted: '採用済みです' };
export function TransferPlanComparison({ planSet, selected, dirty, busy, onSelect, onAdopt, onDefer, onReopenRoute }: {
  planSet: TransferPlanSet; selected: 'faithful' | 'personalized'; dirty: boolean; busy: boolean;
  onSelect: (variant: 'faithful' | 'personalized') => void; onAdopt: () => void; onDefer: () => void; onReopenRoute: () => void;
}) {
  const plan = planSet.plans.find(plan => plan.variant === selected);
  const expired = plan?.route ? plan.route.expiresAt <= Date.now() : false;
  return <section aria-label={m.result}><h3>{m.result}</h3><p role="status">{statusText[planSet.status]}</p>
    {planSet.error && <p className="transfer-error" role="alert">{planSet.error.message}</p>}
    {planSet.plans.length > 0 && <div className="transfer-actions">{planSet.plans.map(plan => <button type="button" key={plan.variant} aria-pressed={plan.variant === selected} onClick={() => onSelect(plan.variant)}>{plan.variant === 'faithful' ? m.faithful : m.personal}</button>)}</div>}
    {plan && <><p>{plan.explanation}</p>
      {plan.steps.map(item => { const original = planSet.recipe.steps.find(step => step.id === item.stepId); const place = planSet.candidates.find(candidate => candidate.placeId === item.placeId); return <article className="transfer-comparison" key={item.stepId}><div><small>{m.original}</small><p>{original?.meaning ?? '元の段階を確認できません'}</p></div><div><small>{m.nextPlace}</small><h4>{place?.name ?? '場所を選定できていません'}</h4><p>{item.explanation}</p></div></article>; })}
      <dl className="transfer-totals"><div><dt>移動</dt><dd>{plan.travelMinutes === null ? '未取得' : `${Math.ceil(plan.travelMinutes)}分`}</dd></div><div><dt>滞在</dt><dd>{plan.stayMinutes}分</dd></div><div><dt>合計</dt><dd>{plan.totalMinutes === null ? '未取得' : `${Math.ceil(plan.totalMinutes)}分`}</dd></div></dl>
      <h4>共通して残すこと</h4><ul>{planSet.commonalities.map((text, index) => <li key={index}>{text}</li>)}</ul>
      <h4>二案の違い</h4><ul>{planSet.differences.map((text, index) => <li key={index}>{text}</li>)}</ul>
      {plan.conditionChecks.length > 0 && <><h4>必須条件の確認</h4><ul>{plan.conditionChecks.map((check, index) => <li key={index}><strong>{check.condition} — {check.status === 'satisfied' ? '確認済み' : check.status === 'unmet' ? '未達' : '未確認'}</strong><p>{check.explanation}</p></li>)}</ul></>}
      {plan.unmetConditions.length > 0 && <><h4>満たせない条件</h4><ul>{plan.unmetConditions.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
      {plan.unknowns.length > 0 && <><h4>{m.unknown}</h4><ul>{plan.unknowns.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
      {expired && <p className="transfer-error">経路の期限が切れました。条件を確かめて二案を作り直してください。</p>}
      <div className="transfer-actions">{planSet.status === 'adopted' && planSet.savedRouteId ? <button type="button" className="transfer-primary" onClick={onReopenRoute}>保存した経路を開く</button> : <button type="button" className="transfer-primary" disabled={busy || dirty || planSet.status !== 'complete' || !plan.eligible || !plan.route || expired} onClick={onAdopt}>{m.adopt}</button>}<button type="button" disabled={busy || dirty} onClick={onDefer}>{m.defer}</button></div>
    </>}
    <p className="transfer-note">{m.routeNote}</p>
  </section>;
}
