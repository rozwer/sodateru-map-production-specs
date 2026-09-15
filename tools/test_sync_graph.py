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

if __name__=='__main__':unittest.main()
