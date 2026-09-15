import { useEffect, useMemo, useState } from 'react';
import type { GrowthItem, Place, Visit } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { useMapBridge } from '../../app/useMapBridge';
import { MapBridge } from '../../app/map-bridge';
import { RecordMapPreview } from '../records/map-preview';
import { RecordHeading, RecordNotice } from '../records/RecordParts';
import { errorText } from '../records/record-flow';
import { placeChoice, useScreenMutation } from '../records/record-hooks';
import { VisitConfirmation } from './VisitConfirmation';
import { displayDuration, displayTime, growthForPlace } from './activity-data';
import { notifyGrowthChanged } from './growth-refresh';

/** A place-only entry saves a candidate first. Confirmation is always a separate action. */
export function VisitEditor({ route, scopeKey, back, navigate, active = true }: ScreenProps) {
  const beginMutation = useScreenMutation(scopeKey, active);
  const bridge = useMapBridge();
  const preview = useMemo(() => new MapBridge(`${scopeKey}:visit-preview`), [scopeKey]);
  useEffect(() => () => preview.dispose(), [preview]);
  const [draft, setDraft] = useScreenState(() => ({
    id: route.params.visitId || crypto.randomUUID(), key: crypto.randomUUID(),
    status: 'candidate' as Visit['status'], placeId: route.params.placeId || '', initialized: false,
  }));
  const [visit, setVisit] = useState<Visit | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);
  useEffect(() => { if (place) { preview.showPlaces('record-place-picker', { places: [{ id: place.id, placeId: place.id, coordinates: place.coordinates, label: place.name }] }); preview.focus('record-place-picker', { center: place.coordinates, zoom: 17 }); } }, [place, preview]);
  const [choices, setChoices] = useState<Place[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0), [loaded, setLoaded] = useState(false), [removed, setRemoved] = useState(false);
  const [growth, setGrowth] = useState<GrowthItem | null | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    const abort = new AbortController(); setError(''); setLoaded(false);
    void (async () => {
      let placeId = draft.placeId;
      if (route.params.visitId || draft.initialized) {
        const { data } = await api.request('getVisitsVisitId', { path: { visitId: draft.id }, signal: abort.signal });
        if (abort.signal.aborted) return;
        setVisit(data); placeId = data.placeId;
        if (!draft.initialized) setDraft(previous => ({ ...previous, status: data.status, placeId: data.placeId, initialized: true }));
      }
      if (placeId) {
        const { data } = await api.request('getPlacesPlaceId', { path: { placeId }, signal: abort.signal });
        if (!abort.signal.aborted) { setCurrentPlace(data.place); setPlace(data.place); }
        if (draft.initialized && draft.placeId && draft.placeId !== placeId) {
          const selected = await api.request('getPlacesPlaceId', { path: { placeId: draft.placeId }, signal: abort.signal });
          if (!abort.signal.aborted) setPlace(selected.data.place);
        }
      }
      if (!abort.signal.aborted) setLoaded(true);
    })().catch(cause => { if (!abort.signal.aborted) setError(errorText(cause)); });
    return () => abort.abort();
  }, [route.params.visitId, scopeKey, active, revision]);

  const refresh = async (placeId: string, signal: AbortSignal) => {
    notifyGrowthChanged(scopeKey);
    try { const result = await growthForPlace(api, placeId, signal); if (!signal.aborted) setGrowth(result); }
    catch (cause) { if (!signal.aborted) setError(`保存は完了しましたが、地図の最新状態を取得できません。${errorText(cause)}`); }
  };
  const save = async () => {
    if (busy || !loaded || !draft.placeId) return;
    setBusy(true); setError(''); setNotice(''); const abort = beginMutation();
    try {
      const { data } = visit
        ? await api.request('patchVisitsVisitId', { path: { visitId: visit.id }, version: visit.version, body: { status: draft.status, placeId: draft.placeId }, signal: abort.signal })
        : await api.request('postVisits', { body: { id: draft.id, placeId: draft.placeId, startedAt: null, endedAt: null, timePrecision: 'unknown', origin: 'manual' }, idempotencyKey: draft.key, signal: abort.signal });
      if (abort.signal.aborted) return;
      setVisit(data); setCurrentPlace(place); setDraft(previous => ({ ...previous, status: data.status, initialized: true }));
      setNotice(visit ? '訪問の変更を保存しました。' : '訪問候補を保存しました。まだ訪問済みにはなりません。');
      await refresh(data.placeId, abort.signal);
    } catch (cause) { if (!abort.signal.aborted) setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!visit || busy) return;
    setBusy(true); setError(''); setNotice(''); const abort = beginMutation();
    try {
      await api.request('deleteVisitsVisitId', { path: { visitId: visit.id }, version: visit.version, signal: abort.signal });
      if (abort.signal.aborted) return;
      setRemoved(true); setNotice('訪問を削除しました。関連する記録の本文は残り、訪問との関連が解除されます。');
      await refresh(visit.placeId, abort.signal);
    } catch (cause) { if (!abort.signal.aborted) setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const choose = async () => {
    setChoosing(true); setError(''); const abort = beginMutation();
    try {
      const items: Place[] = []; let cursor: string | undefined;
      do { const page = await api.request('getPlaces', { query: { limit: 100, cursor }, signal: abort.signal }); items.push(...page.items); cursor = page.nextCursor || undefined; } while (cursor);
      if (!abort.signal.aborted) setChoices(items);
    } catch (cause) { if (!abort.signal.aborted) setError(errorText(cause)); }
  };
  const toMap = () => {
    if (place) bridge.focus('record-place-picker', { center: place.coordinates, zoom: 18 });
    navigate('map', { ...(place ? { placeId: place.id } : {}) });
  };
  if (!loaded || removed) return <section className="records-screen"><RecordHeading title="訪問の確認" onBack={back}/><div className="records-body">
    <RecordNotice error={!!error} retry={error ? () => { if (removed && visit) void refresh(visit.placeId, beginMutation().signal); else setRevision(value => value + 1); } : undefined}>{error || notice || '訪問を読み込んでいます…'}</RecordNotice>
    {removed && <button className="records-primary" onClick={toMap}>地図で確認する</button>}
  </div></section>;
  const timeZone = route.params.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <VisitConfirmation place={place ? placeChoice(place) : null} date={visit?.startedAt == null ? '日時未指定' : new Date(visit.startedAt).toLocaleDateString('ja-JP')}
    time={displayTime(visit?.startedAt ?? null, timeZone)} duration={displayDuration(visit?.startedAt ?? null, visit?.endedAt ?? null)} origin={visit?.origin || 'manual'}
    status={draft.status} onStatus={status => setDraft(previous => ({ ...previous, status }))} onSave={() => void save()} onBack={back} onPlace={() => void choose()} onExpandMap={toMap}
    map={active ? <RecordMapPreview bridge={preview} label="訪問候補の場所" interactive/> : null}
    busy={busy} error={error} notice={notice} candidateOnly={!visit} onReload={() => setRevision(value => value + 1)}
    current={visit ? `保存済み：${currentPlace?.name || "場所取得中"}・${visit.status === 'confirmed' ? '行った' : visit.status === 'rejected' ? '行っていない' : '候補'}（版 ${visit.version}）` : '訪問候補はまだ保存されていません。'}
    extra={<>
      {choosing && <label className="records-input-label">訪問先を訂正<select aria-label="訂正先の場所" value={draft.placeId} disabled={busy} onChange={event => {
        const selected = choices.find(item => item.id === event.target.value); if (!selected) return;
        setDraft(previous => ({ ...previous, placeId: selected.id })); setPlace(selected);
      }}><option value={draft.placeId}>{place?.name || '場所を選択'}</option>{choices.filter(item => item.id !== draft.placeId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>選択しただけでは変更されません。「確認を保存」で確定します。</small></label>}
      {growth !== undefined && <RecordNotice>現在の確認済み訪問：{growth?.confirmedVisitCount || 0}回。用途：{growth?.purposes.join('・') || '未指定'}</RecordNotice>}
      <button className="records-secondary" onClick={toMap}>地図で確認する</button>
      {visit && <button className="records-secondary" onClick={() => navigate('record-create', { visitId: visit.id, placeId: visit.placeId })}>この訪問に記録を追加する</button>}
      {visit && <details><summary>訪問を削除する</summary><p>訪問との関連を解除します。記録本文は残ります。</p><button className="records-danger" disabled={busy} onClick={() => void remove()}>この訪問を削除する</button></details>}
    </>}/>;
}
