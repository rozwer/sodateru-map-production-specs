import contextlib
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import issue_router_bridge as ir
import taskctl as tc


POLICY={'repository':'owner/repo','issue_numbers':{'A':1,'B':2}}


def fixture():
    return {'revision':1,'graph':{'task_policy':POLICY,'tasks':[
        {'id':'A','write_paths':['src/shared/'],'hard_dependencies':[]},
        {'id':'B','write_paths':['src/shared/'],'hard_dependencies':[]}]},
        'tasks':{'A':{'status':'backlog','paths':[],'generation':0},
                 'B':{'status':'claimed','paths':['src/shared/'],'owner':'mattsun'}}}


class RouterBridge(unittest.TestCase):
    def test_no_desktop_no_process(self):
        with patch.dict(os.environ,{},clear=True),patch.object(ir.subprocess,'run') as run:
            self.assertFalse(ir.contact_registration(POLICY,'A'))
            run.assert_not_called()

    def test_router_failure_does_not_raise_or_claim(self):
        with patch.dict(os.environ,{'CODEX_THREAD_ID':'thread-testing'}), \
             patch.object(ir.subprocess,'run',side_effect=subprocess.TimeoutExpired('node',3)), \
             contextlib.redirect_stderr(io.StringIO()) as err:
            self.assertFalse(ir.contact_registration(POLICY,'A'))
            self.assertIn('Contact registration only failed',err.getvalue())

    def test_only_actual_locks_produce_contacts(self):
        board=fixture()
        self.assertEqual(ir.lock_contacts(board,POLICY,'A','dependency:B'),[])
        self.assertEqual(ir.lock_contacts(board,POLICY,'A','API unavailable'),[])
        c=ir.lock_contacts(board,POLICY,'A','lock:B')[0]
        self.assertEqual((c['issue'],c['replyIssue'],c['owner']),(2,1,'mattsun'))
        board['tasks']['B']['status']='done'
        self.assertEqual(ir.lock_contacts(board,POLICY,'A','lock:B'),[])

    def test_real_offline_registration_survives_actual_claim_lock_error(self):
        board=fixture();original=copy.deepcopy(board)
        with tempfile.TemporaryDirectory(prefix='router-claim-') as directory:
            root=Path(directory)
            (root/'config.json').write_text(json.dumps({'login':'alice','repos':{'owner/repo':{'senders':['alice']}}}))
            with patch.dict(os.environ,{'CODEX_THREAD_ID':'thread-testing','ISSUE_ROUTER_HOME':directory}), \
                 patch.object(ir,'ROUTER_CLI',Path(__file__).parent/'vendor/codex-issue-router/bin/router.mjs'), \
                 patch.object(sys,'argv',['taskctl','claim','A']), \
                 patch.object(tc,'local_lock',return_value=contextlib.nullcontext()), \
                 patch.object(tc,'read_board',return_value=('old',board)), \
                 patch.object(tc.op,'owner_at',return_value='rozwer'), \
                 patch.object(tc.op,'verify_issue'),patch.object(tc,'push_board') as push, \
                 contextlib.redirect_stderr(io.StringIO()) as err:
                self.assertEqual(tc.main(),2)
            self.assertEqual(board,original)
            push.assert_not_called()
            route=root/'routes/owner/repo/1/thread-testing.json'
            self.assertTrue(route.is_file())
            self.assertEqual(json.loads(route.read_text())['issue'],1)
            result=json.loads(err.getvalue())
            self.assertEqual(result['error'],'lock:B')
            self.assertEqual(result['contacts'][0]['issue'],2)

    def test_complete_cleanup_runs_only_after_successful_board_push(self):
        board=fixture();events=[]
        with patch.object(sys,'argv',['taskctl','complete','A','--token','token','--commit','HEAD','--evidence','test']), \
             patch.object(tc,'local_lock',return_value=contextlib.nullcontext()), \
             patch.object(tc,'read_board',return_value=('old',board)), \
             patch.object(tc,'change',return_value={'status':'done'}), \
             patch.object(tc,'push_board',side_effect=lambda *a: events.append('push') or True), \
             patch.object(ir,'contact_registration',side_effect=lambda *a: events.append(a[2])), \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(tc.main(),0)
        self.assertEqual(events,['push','unregister'])


if __name__=='__main__':unittest.main()
