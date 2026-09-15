import { randomUUID } from 'node:crypto';
import type { getPluginState } from '../../features/plugins/index.ts';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { transaction } from '../../db/migrate.ts';
import { validateSettings } from './catalog.ts';
import { DisasterProvider, combinedStatus } from './provider.ts';
import { DisasterStore } from './store.ts';
import type { Snapshot, Attempt } from './types.ts';

export class DisasterService {
  constructor(readonly store: DisasterStore, readonly readPluginState: typeof getPluginState, readonly provider=new DisasterProvider(), readonly now:()=>number=Date.now) {}
  private state() {
    const state=this.readPluginState(this.store.db,this.store.context);
    const setting=state.items.find(p=>p.id==='disaster') ?? null;
    const plugin=state.plugins.find(p=>p.pluginId==='disaster') ?? null;
    const active=Boolean(setting?.enabled && plugin?.enabled && plugin.resolvedDeclarations.some(d=>d.targetKey==='layer:disaster' && d.property==='visibility' && d.value===true));
    return {state,setting,plugin,active};
  }
  read() {
    const {result,lastAttempt}=this.store.read(),{state,setting,plugin,active}=this.state();
    const matches=Boolean(result && setting && result.installId===setting.installId && result.settingsVersion===setting.version && result.pluginVersion===setting.pluginVersion && JSON.stringify(result.settings)===JSON.stringify(setting.settings));
    const stale=Boolean(result && (result.expiresAt<=this.now() || !matches || (lastAttempt && lastAttempt.status!=='complete')));
    const canApply=Boolean(active && matches && result && result.layers.some(l=>l.tiles.some(t=>t.status==='available')));
    return {
      dataKind:'live' as const,settings:setting, result,lastAttempt, stale,
      map:{action:canApply ? 'apply' as const : 'clear' as const,ownerKey:canApply ? plugin!.ownerKey : result ? `plugin:${result.installId}` : plugin?.ownerKey ?? null,
        pluginRevision:state.revision,settingsVersion:setting?.version ?? null,resultId:result?.resultId ?? null,
        bounds:canApply ? result!.settings.region.bounds : null,
        reason:canApply ? (stale ? 'stale' : 'ready') : !active ? 'disabledOrUnresolved' : !result ? 'noResult' : !matches ? 'settingsChanged' : 'noResult',
        // UI uses the saved layers and PNG data URLs from result only when action=apply.
        layerIds:canApply ? result!.layers.filter(l=>l.tiles.some(t=>t.status==='available')).map(l=>l.layerId) : []},
    };
  }
  async refresh(expected: number) {
    return (await this.prepareRefresh(expected)).commit();
  }
  async prepareRefresh(expected: number) {
    const before=this.state();
    if(!before.setting) throw new CommonError('NOT_FOUND','防災機能を導入してください。');
    requireVersion(before.setting.version,expected);
    if(!before.active) throw new CommonError('STATE_CONFLICT','停止中または表示競合が未解決です。');
    const settings=validateSettings(before.setting.settings);
    const baselineResultId=this.store.read().result?.resultId ?? null;
    const layers=await this.provider.fetchLayers(settings,this.store.context.signal);
    this.store.context.signal.throwIfAborted();
    const hasData=layers.some(l=>l.tiles.some(t=>t.status==='available' && t.role==='data'));
    return {failed:!hasData,commit:()=>transaction(this.store.db,()=>{
      const after=this.state();
      if(!after.active || after.setting?.installId!==before.setting!.installId || after.setting?.version!==before.setting!.version || after.state.revision!==before.state.revision) {
        throw new CommonError('SOURCE_CHANGED','取得中に導入状態・設定・競合が変わりました。結果を適用していません。');
      }
      const previous=this.store.read().result;
      if((previous?.resultId ?? null)!==baselineResultId)throw new CommonError('SOURCE_CHANGED','別の更新が先に完了しました。古い取得結果を適用していません。');
      const status=combinedStatus(layers);
      const retrievalComplete=layers.every(l=>l.tiles.length>0 && l.tiles.every(t=>t.status==='available') && (l.layerId!=='rainfall'||l.noDataMask!==null));
      const attempt: Attempt={attemptedAt:this.now(),status:retrievalComplete ? 'complete' : hasData ? 'partial' : 'failed',settings,layers};
      const snapshot: Snapshot={resultId:randomUUID(),dataKind:'live',settings,installId:before.setting!.installId,
        settingsVersion:before.setting!.version,pluginVersion:before.setting!.pluginVersion,fetchedAt:this.now(),
        expiresAt:Math.min(this.now()+(settings.layerIds.includes('rainfall') ? 10*60_000 : 24*60*60_000),...layers.filter(l=>l.layerId==='rainfall' && l.validAt!==null).map(l=>l.validAt!+10*60_000)),status,layers,
        unknowns:['現在の浸水を示すデータは含みません。欠測・未着色は安全の根拠になりません。']};
      // Any failed refresh preserves the prior bytes and original region/times.
      const retain=previous && !retrievalComplete;
      this.store.save(retain ? previous : hasData ? snapshot : previous,attempt);
      return {failed:!hasData,view:this.read()};
    })};
  }
}
