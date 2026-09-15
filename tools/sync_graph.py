"""Validate and CAS-update the board graph without resetting execution state."""
import argparse,copy,json,sys
from pathlib import Path
import taskctl as tc
from document_paths import moves,relocate

UI_SPLIT_IDS = ('BASE','MAP','RECORDS','EXPLORE','ROUTES','REFLECTION','INSIGHTS',
                'SUGGESTIONS','FRIENDS','KNOWLEDGE','PLUGINS','SETTINGS','COMPANION')
HEALTH_PAGES = ['health-connect','health-permissions','health-status']

def check(condition, message):
    if not condition: raise tc.BoardError('UI split: '+message)

def validate_ui_split(graph):
    """Only Issue #72's enumerated split, exclusion and health deferral are allowed.

    This validates definitions, never execution state. migrate additionally checks
    the embedded before-definitions against the currently published board.
    """
    split=graph.get('ui_connection_split')
    if not split:return {}
    check(split.get('version')==1 and split.get('authorization_issue')==72 and
          split.get('repository')=='rozwer/sodateru-map-production-specs', 'missing specific authorization')
    by={t['id']:t for t in graph['tasks']};pairs=split['pairs'];policy=graph['task_policy']
    check(set(pairs)=={'UI-'+x for x in UI_SPLIT_IDS},'only the 13 approved sources')
    check(policy['owners']=={'A':'rozwer','B':'koshiro','C':'kaiya','D':'mattsun'},'owners changed')
    before={}
    for sid,pair in pairs.items():
        cid=sid.replace('UI-','CONNECT-',1);old=pair['before'];ui=by[sid];con=by.get(cid,{})
        check(pair['source_task']==sid and pair['connection_task']==cid and old['id']==sid,'pair identity')
        check(pair['source_issue']==old['github_issue']==policy['issue_numbers'][sid],'source Issue changed')
        check(pair['connection_issue']==con.get('github_issue')==policy['issue_numbers'].get(cid),'connection Issue mismatch')
        ref='docs/03_issue/ui-connections.json#/pairs/'+sid
        expected=copy.deepcopy(old)
        expected['connect_inputs']=[x for x in old['connect_inputs'] if x['issue']=='UI-BASE']
        expected['connect_after']=[x['issue'] for x in expected['connect_inputs']]
        expected['completion_scope']={'phase':'ui','mapping':ref,'connection_task':cid}
        expected['contract_gates']={'common':[],'feature_gaps':[], 'scope':'UI境界と表示に必要な確定済み型を使う。非UI契約の実接続ゲートは'+cid+'へ移す。'}
        if sid=='UI-BASE':expected['early_release']='共通部品・画面登録・地図/チャットの境界と実shellを先行統合する。本人context/共通clientの実接続はCONNECT-BASEが持つ。'
        if sid=='UI-SETTINGS':expected['completion_scope']['deferred_health']='UI-HEALTH'
        if sid=='UI-COMPANION':expected['scope_exclusions']=['companion-create']
        if sid=='UI-SETTINGS':expected['title']='設定・プロフィール・活動統計と取得元（非健康）'
        if sid=='UI-COMPANION':expected['title']='既存相棒の取込・管理・動作確認と選択'
        check(ui==expected,'source identity/paths/scope changed outside approval: '+sid)
        check(con.get('id')==cid and con.get('lane')==old['lane']=='A' and con.get('kind')==old['kind']=='ui','connection owner/kind')
        check(con.get('hard_dependencies')==[sid],'connection must wait for source done: '+cid)
        check(con.get('write_paths')==[p for p in old['write_paths'] if not p.startswith('docs/evidence/')]+['docs/evidence/'+cid+'/'],'connection expands paths')
        for key in ('requirement_ids','acceptance_ids','pages','owned_operations','owned_gaps'):
            check(con.get(key)==old[key],'connection drops original '+key+': '+cid)
        scope={'phase':'connection','mapping':ref,'source_ui_task':sid}
        if sid=='UI-SETTINGS':scope['deferred_health']='CONNECT-HEALTH'
        check(con.get('completion_scope')==scope,'connection scope reference')
        inputs={x['issue']:x for x in con['connect_inputs']}
        check(list(inputs)==con['connect_after'],'connection input order/duplicates')
        for entry in old['connect_inputs']:
            if sid=='UI-SETTINGS' and entry['issue']=='HEALTH':
                check(entry in split['health_deferral']['provider_inputs'],'health input lost');continue
            required=set(entry['outputs'])
            if sid=='UI-COMPANION' and entry['issue']=='COMPANION':required.discard('COMPANION.create')
            check(entry['issue'] in inputs and required<=set(inputs[entry['issue']]['outputs']),'provider input lost: '+sid)
        criteria=pair['criteria'];reqs=[c['source_requirement_id'] for c in criteria]
        acc=[a for c in criteria for a in c['source_acceptance_ids']]
        check(len(reqs)==len(set(reqs)) and set(reqs)==set(old['requirement_ids']),'requirement mapping lost')
        check(len(acc)==len(set(acc)) and set(acc)==set(old['acceptance_ids']),'acceptance mapping lost')
        check([p['page'] for p in pair['pages']]==old['pages'],'page mapping lost')
        for c in criteria:
            check(c['source_requirement']['id']==c['source_requirement_id'] and
                  c['source_requirement']['acceptance']==c['source_acceptance_ids'],'source requirement mismatch')
            check([a['id'] for a in c['source_acceptance']]==c['source_acceptance_ids'] and
                  all(a['requirement']==c['source_requirement_id'] for a in c['source_acceptance']),'source acceptance mismatch')
            check(all(isinstance(c.get(k),str) and len(c[k])>10 for k in ('ui_check','connection_check','failure_check')),'empty phase check')
            status='user-excluded' if c['page']=='companion-create' else 'deferred' if sid=='UI-SETTINGS' and c['page'] in HEALTH_PAGES else 'not-run'
            check(c['ui_status']==c['connection_status']==status,'scope cannot claim product acceptance')
        before[sid]=old
    excluded=split['user_exclusions']
    check(set(excluded)=={'companion-create'},'unapproved exclusion')
    e=excluded['companion-create']
    check(e['status']=='user-excluded' and e['authorization_issue']==72 and e['provider_outputs']==['COMPANION.create'],'companion exclusion')
    check(set(e['requirement_ids'])=={'companion-create-R1',*(f'companion-create-F0{i}' for i in range(1,5))},'companion original requirements')
    check(set(e['acceptance_ids'])=={'companion-create-C1',*(f'companion-create-FC0{i}' for i in range(1,5))},'companion original acceptance')
    check(e['partial_requirement_ids']==['companion-settings-F03'] and e['partial_acceptance_ids']==['companion-settings-FC03'],'partial exclusion widened')
    check(set(split['domain_exclusions'])=={'COMPANION'},'unapproved domain change')
    old=split['domain_exclusions']['COMPANION']['before'];expected=copy.deepcopy(old);expected['scope_exclusions']=['companion-create']
    expected['title']='既存相棒のZIP取込・保存・表示管理と選択'
    check(by['COMPANION']==expected,'companion identity/state scope changed');before['COMPANION']=old
    health=split['health_deferral'];check(health['authorization_issue']==72 and health['pages']==HEALTH_PAGES,'health deferral')
    check(health['shared_pages']==['settings','activity-stats','data-sources'],'non-health pages excluded')
    old=health['domain_before'];expected=copy.deepcopy(old)
    expected.update(scope_schedule={'mode':'if-time-remains','required_for_other_features':False},priority='P3',effective_priority='P3')
    check(by['HEALTH']==expected,'health changes beyond priority/schedule');before['HEALTH']=old
    for tid,phase,dep in [('UI-HEALTH','deferred-ui','UI-SETTINGS'),('CONNECT-HEALTH','deferred-connection','UI-HEALTH')]:
        t=by[tid]
        check(t['lane']=='A' and t['kind']=='ui' and t['hard_dependencies']==[dep],'health identity/dependency')
        check(t['priority']==t['effective_priority']=='P3' and t['scope_schedule']=={'mode':'if-time-remains','required_for_other_features':False},'health is optional')
        check(t['pages']==HEALTH_PAGES and t['shared_pages']==health['shared_pages'],'health page scope')
        check(t['write_paths']==[p for p in by['UI-SETTINGS']['write_paths'] if not p.startswith('docs/evidence/')]+['docs/evidence/'+tid+'/'],'health expands paths')
        check(t['completion_scope']=={'phase':phase,'mapping':'docs/03_issue/ui-connections.json#/health_deferral','source_ui_task':dep},'health scope reference')
        check(t['requirement_ids']==[c['source_requirement_id'] for c in health['criteria']] and t['acceptance_ids']==[a for c in health['criteria'] for a in c['source_acceptance_ids']],'health mapping lost')
    check(all('HEALTH' not in t.get('connect_after',[])+t.get('hard_dependencies',[]) and
              not {'UI-HEALTH','CONNECT-HEALTH'} & set(t.get('connect_after',[])+t.get('hard_dependencies',[]))
              for t in graph['tasks'] if t['id'] not in ('UI-HEALTH','CONNECT-HEALTH')),'health became a required dependency')
    return before

def validate(graph):
    tasks=graph['tasks']; ids=[t['id'] for t in tasks]
    if len(ids)!=len(set(ids)): raise tc.BoardError('Duplicate task ID')
    by={t['id']:t for t in tasks}
    policy=graph.get('task_policy')
    if policy:
        numbers=policy['issue_numbers']
        if set(numbers)!=set(ids) or len(set(numbers.values()))!=len(numbers) or any(not isinstance(n,int) or n<1 for n in numbers.values()):raise tc.BoardError('Task/Issue mapping must be complete and unique')
        if policy['integration_branch']!='develop':raise tc.BoardError('Integrate tasks into develop')
    for t in tasks:
        for p in t['write_paths']: tc.normalized(p)
        for dep in t['hard_dependencies']+t.get('connect_after',[]):
            if dep not in by or dep==t['id']: raise tc.BoardError('Unknown/self dependency: '+dep)
    supersessions=graph.get('supersessions',{})
    if not isinstance(supersessions,dict):raise tc.BoardError('Supersessions must map stable IDs to successors')
    for old,successor in supersessions.items():
        if old not in by or successor not in by or old==successor or successor in supersessions:
            raise tc.BoardError('Invalid or chained successor: '+old)
        if old not in by[successor].get('source_task_ids',[]):raise tc.BoardError('Successor must retain source scope: '+old)
    for t in tasks:
        if not t.get('residual_unit'):continue
        for source in t['source_task_ids']:
            if supersessions.get(source)!=t['id']:raise tc.BoardError('Residual source ownership mismatch: '+source)
        required={req for source in t['source_task_ids'] for req in by[source]['requirement_ids']}
        if not required<=set(t['requirement_ids']) | set(t.get('legacy_requirement_ids', [])):raise tc.BoardError('Residual unit drops requirements: '+t['id'])
        expected=[{'id':source,'issue':policy['issue_numbers'][source],
                   'deliverable':by[source]['deliverable'],'acceptance':by[source]['acceptance']} for source in t['source_task_ids']]
        if t['remaining_checklist']!=expected:raise tc.BoardError('Residual unit drops original acceptance: '+t['id'])
        if any(dep in supersessions for dep in t['hard_dependencies']+t.get('connect_after',[])):
            raise tc.BoardError('Residual unit still depends on retired source: '+t['id'])
    for number,target in graph.get('related_issue_transfers',{}).items():
        if not str(number).isdigit() or int(number)<1 or target not in by:
            raise tc.BoardError('Invalid related Issue transfer')
        if policy and int(number) in policy['issue_numbers'].values():
            raise tc.BoardError('Registered Task must use supersessions, not related Issue transfer')
        if int(number) not in [item['issue'] for item in by[target].get('additional_findings',[])]:
            raise tc.BoardError('Related finding acceptance missing')
    visiting=set();done=set()
    def visit(id):
        if id in visiting: raise tc.BoardError('Hard dependency cycle: '+id)
        if id in done:return
        visiting.add(id)
        for dep in by[id]['hard_dependencies']:visit(dep)
        visiting.remove(id);done.add(id)
    for id in by:visit(id)
    validate_ui_split(graph)

def migrate(board,graph,document_moves=None):
    graph=copy.deepcopy(graph)
    published={t['id'] for t in graph['tasks']}
    retained=set(board.get('inline_tasks',[]))-published
    for task in board['graph']['tasks']:
        if task['id'] in retained:
            graph['tasks'].append(copy.deepcopy(task))
            if graph.get('task_policy'):
                graph['task_policy']['issue_numbers'][task['id']]=board['graph']['task_policy']['issue_numbers'][task['id']]
    validate(graph);new=copy.deepcopy(board)
    new['inline_tasks']=sorted(retained)
    previous={t['id']:t for t in board['graph']['tasks']};current={t['id']:t for t in graph['tasks']}
    split_before=validate_ui_split(graph)
    old_split=board['graph'].get('ui_connection_split')
    if old_split is not None and old_split!=graph.get('ui_connection_split'):
        raise tc.BoardError('Cannot replace/remove published UI split metadata')
    permitted=set()
    if split_before and old_split is None:
        for id,before in split_before.items():
            check(previous.get(id)==before,'before-definition differs from live board: '+id)
        permitted=set(split_before)
    if set(previous)-set(current): raise tc.BoardError('Keep stable IDs; retire/split with a successor instead of deletion')
    for id,t in current.items():
        if id not in previous:
            new['tasks'][id]={'status':'backlog','actor':None,'token':None,'generation':0,'paths':[],'note':None}
        elif board['tasks'][id]['status']!='backlog' and t!=previous[id] and id not in permitted and (not document_moves or t!=relocate(previous[id],document_moves)) and not (id in board.get('inline_tasks',[]) and all(t.get(key)==value for key,value in previous[id].items())):
            raise tc.BoardError('Active/completed task definition changed: '+id+'; release active work or add a follow-up task')
    if any(graph.get('related_issue_transfers',{}).get(k)!=v for k,v in board['graph'].get('related_issue_transfers',{}).items()):
        raise tc.BoardError('Cannot remove or change a published related Issue transfer')
    old_mapping=board['graph'].get('supersessions',{})
    mapping=graph.get('supersessions',{})
    if any(mapping.get(source)!=target for source,target in old_mapping.items()):
        raise tc.BoardError('Cannot remove or change a published supersession')
    for source,successor in mapping.items():
        if source not in board['tasks']:raise tc.BoardError('Cannot retire a missing source')
        state=board['tasks'][source]
        if state['status']=='superseded' and state.get('superseded_by')==successor:
            continue
        if state['status']!='backlog' or state.get('paths') or state.get('token'):
            raise tc.BoardError('Only unclaimed backlog can be superseded: '+source)
        if previous[source]!=current[source]:raise tc.BoardError('Keep superseded source definition unchanged: '+source)
        new['tasks'][source].update(status='superseded',superseded_by=successor,
                                   superseded_at_revision=board['revision']+1)
    if split_before:
        check(all(new['tasks'][id]==state for id,state in board['tasks'].items()),'existing execution state must remain byte-for-byte equivalent')
    new['graph']=copy.deepcopy(graph);new['revision']+=1
    return new

def main():
    p=argparse.ArgumentParser();p.add_argument('--remote',default='origin');p.add_argument('--manifest',default='TASK_GRAPH.json');p.add_argument('--apply',action='store_true');a=p.parse_args()
    graph=json.loads(Path(a.manifest).read_text());validate(graph)
    if a.apply:
        # Only a graph already shared on main can become the execution definition.
        source_branch='develop' if tc.git('ls-remote',a.remote,'refs/heads/develop') else 'main'
        tc.git('fetch',a.remote,source_branch)
        published=json.loads(tc.git('show',f'{a.remote}/{source_branch}:TASK_GRAPH.json'))
        if graph!=published:raise tc.BoardError('Merge graph into the remote integration branch before applying board changes')
        if moves():
            published_moves=json.loads(tc.git('show',f'{a.remote}/{source_branch}:docs/team/document-paths.json'))
            if moves()!=published_moves:raise tc.BoardError('Publish exact document path migration on main first')
    with tc.local_lock('writer',a.remote):
        for _ in range(6):
            oid,board=tc.read_board(a.remote)
            if not board:raise tc.BoardError('Initialize board once before syncing')
            updated=migrate(board,graph,moves())
            if not a.apply:
                print(json.dumps({'dry_run':True,'tasks':len(graph['tasks']),'revision':board['revision']}));return
            if tc.push_board(a.remote,oid,updated,'taskctl sync graph'):
                print(json.dumps({'synced':True,'revision':updated['revision']}));return
        raise tc.BoardError('Concurrent update; nothing confirmed. Retry from current state')
if __name__=='__main__':
    try:main()
    except (tc.BoardError,ValueError,KeyError,OSError) as e:print(str(e),file=sys.stderr);sys.exit(2)
