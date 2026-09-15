"""Regression for the explicitly authorized #72 migration, not UI acceptance."""
import copy
import json
import unittest
from pathlib import Path
import sync_graph as sg
import taskctl as tc

ROOT = Path(__file__).resolve().parents[1]

class UiConnectionMigrationTest(unittest.TestCase):
    def setUp(self):
        self.graph = json.loads((ROOT/'TASK_GRAPH.json').read_text())
        # Reconstruct the first split independently of later published retirements.
        self.graph.pop('supersessions',None)
        self.graph.pop('supersession_details',None)
        split = self.graph['ui_connection_split']
        old = copy.deepcopy(self.graph)
        old.pop('ui_connection_split')
        additions = {p['connection_task'] for p in split['pairs'].values()} | {'UI-HEALTH','CONNECT-HEALTH'}
        before = {k:p['before'] for k,p in split['pairs'].items()}
        before['COMPANION'] = split['domain_exclusions']['COMPANION']['before']
        before['HEALTH'] = split['health_deferral']['domain_before']
        old['tasks'] = [copy.deepcopy(before.get(t['id'],t)) for t in old['tasks'] if t['id'] not in additions]
        for id in additions: old['task_policy']['issue_numbers'].pop(id)
        inline = {'id':'UI-INTEGRATION','title':'画面組込み','kind':'ui','lane':'A',
                  'priority':'P0','hard_dependencies':[],'connect_after':[],
                  'write_paths':['src/integration/','docs/integration/']}
        old['tasks'].append(inline)
        old['task_policy']['issue_numbers']['UI-INTEGRATION']=98
        states={}
        for i,t in enumerate(old['tasks']):
            status=('claimed','submitted','done')[i%3]
            states[t['id']]={'status':status,'actor':'rozwer','token':'unchanged-'+t['id'],
                'generation':i+7,'paths':copy.deepcopy(t['write_paths']),
                'base':'existing-base','submitted_commit':'existing-submission','note':'existing-evidence',
                'custom_future_field':{'preserve':[1,2,3]}}
        self.board={'graph':old,'tasks':states,'revision':99,'inline_tasks':['UI-INTEGRATION']}

    def test_exact_execution_state_and_inline_survive(self):
        original=copy.deepcopy(self.board)
        result=sg.migrate(self.board,self.graph)
        self.assertEqual(self.board,original)
        for id,state in original['tasks'].items():self.assertEqual(result['tasks'][id],state)
        self.assertIn('UI-INTEGRATION',result['inline_tasks'])
        self.assertEqual(result['graph']['task_policy']['issue_numbers']['UI-INTEGRATION'],98)
        self.assertEqual(len(result['tasks']),len(original['tasks'])+15)
        self.assertEqual(result['tasks']['CONNECT-MAP']['status'],'backlog')
        self.assertIsNone(result['tasks']['CONNECT-MAP']['token'])
        again=sg.migrate(result,self.graph)
        self.assertEqual(again['tasks'],result['tasks'])

    def reject(self, edit):
        graph=copy.deepcopy(self.graph);edit(graph)
        with self.assertRaises(tc.BoardError):sg.migrate(self.board,graph)

    def task(self,g,id):return next(t for t in g['tasks'] if t['id']==id)

    def test_no_general_active_edit_permission(self):
        self.reject(lambda g:self.task(g,'CORE').update(title='unrelated change'))
        self.reject(lambda g:g.pop('ui_connection_split'))
        self.reject(lambda g:g['ui_connection_split'].update(authorization_issue=1))

    def test_identity_paths_and_before_are_fixed(self):
        self.reject(lambda g:self.task(g,'UI-MAP')['write_paths'].append('server/'))
        self.reject(lambda g:self.task(g,'UI-MAP').update(lane='B'))
        self.reject(lambda g:self.task(g,'COMPANION').update(title='different'))
        self.reject(lambda g:self.task(g,'HEALTH')['write_paths'].append('src/'))
        self.reject(lambda g:g['ui_connection_split']['pairs']['UI-MAP']['before'].update(title='forged baseline'))

    def test_requirements_acceptance_and_dependencies_cannot_disappear(self):
        self.reject(lambda g:self.task(g,'CONNECT-MAP')['requirement_ids'].pop())
        self.reject(lambda g:g['ui_connection_split']['pairs']['UI-MAP']['criteria'].pop())
        self.reject(lambda g:self.task(g,'CONNECT-MAP').update(hard_dependencies=[]))
        self.reject(lambda g:self.task(g,'CONNECT-MAP')['connect_inputs'][1]['outputs'].clear())
        self.reject(lambda g:g['ui_connection_split']['pairs']['UI-MAP']['criteria'][0].update(ui_check=''))

    def test_exclusion_and_deferral_are_narrow(self):
        self.reject(lambda g:g['ui_connection_split']['user_exclusions'].update(arbitrary={}))
        self.reject(lambda g:self.task(g,'CONNECT-HEALTH').update(priority='P0'))
        self.reject(lambda g:self.task(g,'CONNECT-SETTINGS')['connect_after'].append('HEALTH'))
        self.reject(lambda g:self.task(g,'UI-HEALTH').update(hard_dependencies=[]))

    def test_published_metadata_is_immutable(self):
        migrated=sg.migrate(self.board,self.graph)
        changed=copy.deepcopy(self.graph)
        changed['ui_connection_split']['source_commit']='different'
        with self.assertRaises(tc.BoardError):sg.migrate(migrated,changed)

class SupersessionMigrationTest(unittest.TestCase):
    def setUp(self):
        self.graph=json.loads((ROOT/'TASK_GRAPH.json').read_text())
        self.graph.pop('supersessions',None)
        self.graph.pop('supersession_details',None)
        self.source={'id':'TEST-OLD','title':'original','kind':'repair','priority':'P1',
            'hard_dependencies':[],'write_paths':['docs/test/'],
            'requirement_ids':['R1','R2'],'acceptance_ids':['A1','A2'],
            'acceptance':['keep API','check mobile'],'pages':['one','two']}
        self.graph['tasks'].append(self.source)
        self.graph['task_policy']['issue_numbers']['TEST-OLD']=99001
        self.board={'graph':copy.deepcopy(self.graph),'revision':80,'tasks':{
            t['id']:{'status':'backlog','actor':None,'token':None,'paths':[],
                'generation':3,'note':'preserved evidence','submitted_commit':'historical commit',
                'custom':{'future':[1,2]}} for t in self.graph['tasks']}}
        self.graph['supersessions']={'TEST-OLD':['TEST-ONE','TEST-TWO']}
        for i,target in enumerate(['TEST-ONE','TEST-TWO']):
            task=copy.deepcopy(self.source)
            task.update(id=target,source_task_ids=['TEST-OLD'],requirement_ids=['R'+str(i+1)],
                        acceptance_ids=['A'+str(i+1)],pages=[['one','two'][i]])
            self.graph['tasks'].append(task)
            self.graph['task_policy']['issue_numbers'][target]=99002+i
        self.graph['supersession_details']={'TEST-OLD':{
            'source_issue':99001,'authorization_issue':229,'reason':'split work',
            'evidence':'docs/evidence/test.md','source_acceptance':['keep API','check mobile'],
            'pages_by_successor':{'TEST-ONE':['one'],'TEST-TWO':['two']}}}

    def task(self,id):return next(t for t in self.graph['tasks'] if t['id']==id)

    def test_split_then_supersede_preserves_all_other_state_and_evidence(self):
        original=copy.deepcopy(self.board)
        result=sg.migrate(self.board,self.graph)
        expected=copy.deepcopy(original['tasks'])
        expected['TEST-OLD'].update(status='superseded',superseded_by=['TEST-ONE','TEST-TWO'],superseded_at_revision=81)
        for id,state in expected.items():self.assertEqual(result['tasks'][id],state)
        self.assertEqual(self.board,original)
        self.assertEqual(sg.migrate(result,self.graph)['tasks'],result['tasks'])

    def test_single_successor_is_backward_compatible(self):
        self.graph['supersessions']['TEST-OLD']='TEST-ONE'
        self.graph.pop('supersession_details')
        self.task('TEST-ONE').update(requirement_ids=['R1','R2'],acceptance_ids=['A1','A2'])
        result=sg.migrate(self.board,self.graph)
        self.assertEqual(result['tasks']['TEST-OLD']['superseded_by'],'TEST-ONE')
        self.assertEqual(sg.migrate(result,self.graph)['tasks'],result['tasks'])

    def test_claimed_submitted_done_and_stale_lock_are_rejected(self):
        for change in [{'status':x} for x in ['claimed','submitted','done']]+[{'token':'live'},{'paths':['docs/test/']}]:
            with self.subTest(change=change):
                board=copy.deepcopy(self.board);board['tasks']['TEST-OLD'].update(change)
                with self.assertRaisesRegex(tc.BoardError,'Only unclaimed backlog'):sg.migrate(board,self.graph)

    def test_invalid_successors_are_rejected(self):
        for value in [[],{},None,3,['TEST-ONE','TEST-ONE'],['missing'],['TEST-OLD'],[['TEST-ONE']]]:
            with self.subTest(value=value):
                graph=copy.deepcopy(self.graph);graph['supersessions']['TEST-OLD']=value
                with self.assertRaises(tc.BoardError):sg.migrate(self.board,graph)
        self.graph['supersessions']['TEST-ONE']='TEST-TWO'
        with self.assertRaisesRegex(tc.BoardError,'chained'):sg.migrate(self.board,self.graph)

    def test_missing_acceptance_requirements_and_pages_are_rejected(self):
        changes=[lambda g:g.pop('supersession_details'),
            lambda g:g['supersession_details']['TEST-OLD'].update(source_acceptance=[]),
            lambda g:g['supersession_details']['TEST-OLD']['source_acceptance'].pop(),
            lambda g:g['supersession_details']['TEST-OLD']['pages_by_successor'].pop('TEST-TWO'),
            lambda g:g['supersession_details']['TEST-OLD']['pages_by_successor'].update({'TEST-TWO':['wrong']}),
            lambda g:g['supersession_details']['TEST-OLD'].update(source_issue=1)]
        for field in ['requirement_ids','acceptance_ids','source_task_ids']:
            changes.append(lambda g,f=field:next(t for t in g['tasks'] if t['id']=='TEST-TWO')[f].clear())
        for change in changes:
            graph=copy.deepcopy(self.graph);change(graph)
            with self.subTest(graph=graph.get('supersession_details')):
                with self.assertRaises(tc.BoardError):sg.migrate(self.board,graph)

    def test_published_mapping_details_and_source_definition_are_immutable(self):
        result=sg.migrate(self.board,self.graph)
        graph=copy.deepcopy(self.graph);graph['supersession_details']['TEST-OLD']['source_acceptance'].append('changed')
        with self.assertRaisesRegex(tc.BoardError,'published supersession details'):sg.migrate(result,graph)
        graph=copy.deepcopy(self.graph);graph['supersessions']['TEST-OLD'].reverse()
        with self.assertRaisesRegex(tc.BoardError,'published supersession'):sg.migrate(result,graph)
        self.task('TEST-OLD')['title']='modified source'
        with self.assertRaisesRegex(tc.BoardError,'source definition unchanged'):sg.migrate(self.board,self.graph)

    def test_first_ui_split_still_rejects_any_existing_state_transition(self):
        old=copy.deepcopy(self.board)
        metadata=old['graph'].pop('ui_connection_split')
        before={sid:pair['before'] for sid,pair in metadata['pairs'].items()}
        before.update(COMPANION=metadata['domain_exclusions']['COMPANION']['before'],
                      HEALTH=metadata['health_deferral']['domain_before'])
        old['graph']['tasks']=[copy.deepcopy(before.get(t['id'],t)) for t in old['graph']['tasks']]
        with self.assertRaisesRegex(tc.BoardError,'byte-for-byte'):sg.migrate(old,self.graph)

if __name__=='__main__':unittest.main()
