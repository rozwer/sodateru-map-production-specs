"""Cooperative commit/push guard; not a security boundary."""
import json, re, subprocess, sys
from pathlib import Path
import taskctl as tc
import owner_policy as op

def bootstrap_enabled():
    return tc.git('config','--bool','--get','sodateru.bootstrapMode',check=False) == 'true'

def bootstrap_branch(branch):
    return bool(re.fullmatch(r'bootstrap/[a-z0-9]+(?:-[a-z0-9]+)*',branch))

def remote_branch(name):
    return tc.git('rev-parse','--verify','refs/remotes/origin/'+name,check=False).strip()

def zero(oid):
    return set(oid)=={'0'}

def ancestor(old,new):
    return subprocess.run(['git','merge-base','--is-ancestor',old,new],capture_output=True).returncode==0

def check_bootstrap(mode, branch, ref_updates, updates):
    develop=remote_branch('develop')
    if not develop:
        if branch!='main':raise tc.BoardError('Fetch or create origin/develop before leaving initial main bootstrap')
        if mode=='pre-commit':return
        if mode=='refs':
            rows=[row for row in ref_updates if row[2].startswith('refs/heads/')]
            if rows and all(len(row)==3 and row[2]=='refs/heads/main' and not zero(row[1]) for row in rows):return
            raise tc.BoardError('Initial bootstrap permits local updates to main only')
        if mode=='pre-push':
            if not updates or any(row[2]!='refs/heads/main' or zero(row[1]) for row in updates):
                raise tc.BoardError('Initial bootstrap permits pushes to main only')
            for _,local_oid,_,remote_oid in updates:
                if not zero(remote_oid) and not ancestor(remote_oid,local_oid):
                    raise tc.BoardError('Only fast-forward initial pushes to main are allowed')
            return
        raise tc.BoardError('Unsupported bootstrap hook mode')
    if mode=='pre-commit':
        if bootstrap_branch(branch):return
        raise tc.BoardError('Pre-board changes require a bootstrap/<description> branch from origin/develop')
    if mode=='refs':
        for old,new,ref in (row for row in ref_updates if row[2].startswith('refs/heads/')):
            name=ref[len('refs/heads/'):]
            if name in ('main','develop'):
                remote=remote_branch(name)
                if zero(new) or not remote or new!=remote:
                    raise tc.BoardError('Shared branches only mirror origin during pre-board preparation')
            elif bootstrap_branch(name):
                if zero(new):raise tc.BoardError('Pre-board branch deletion is not an editing operation')
                if zero(old):
                    if new!=develop:raise tc.BoardError('Start bootstrap branches at origin/develop')
                elif not ancestor(old,new):raise tc.BoardError('Bootstrap branch updates must be fast-forward')
            else:raise tc.BoardError('Use bootstrap/<description> for pre-board preparation')
        return
    if mode=='pre-push':
        if not updates:raise tc.BoardError('No pre-board push updates supplied')
        for local_ref,local_oid,remote_ref,remote_oid in updates:
            prefix='refs/heads/'
            name=remote_ref[len(prefix):] if remote_ref.startswith(prefix) else ''
            if not bootstrap_branch(name) or local_ref!=remote_ref:
                raise tc.BoardError('Push bootstrap/<description> and merge a PR into develop')
            if zero(local_oid) or not ancestor(develop,local_oid):
                raise tc.BoardError('Bootstrap pushes must descend from origin/develop')
            if not zero(remote_oid) and not ancestor(remote_oid,local_oid):
                raise tc.BoardError('Bootstrap pushes must be fast-forward')
        return
    raise tc.BoardError('Unsupported bootstrap hook mode')

def allowed(files, paths):
    outside=[f for f in files if not any(f==p or (p.endswith('/') and f.startswith(p)) for p in paths)]
    if outside: raise tc.BoardError('Changed paths outside claim: '+', '.join(outside))

def check_commit(board, commit, branch, staged=False, *, check_github=True):
    task=op.resolve_branch(board,branch,check_github=check_github)
    if op.policy_for(board):op.require_linked_worktree()
    s=board['tasks'].get(task)
    if not s or s['status'] not in ('claimed','submitted'): raise tc.BoardError('No active claim for '+task)
    files=tc.task_changed_files(board,s,commit,staged=staged)
    allowed(files,s['paths'])

def main():
    mode=sys.argv[1]
    ref_updates=[]
    updates=None
    if mode=='pre-push':
        updates=[line.split() for line in sys.stdin if line.strip()]
        if not updates:return
        if len(updates)==1 and updates[0][2]==tc.REF and set(updates[0][1])!={'0'}:
            _,new,ref,old=updates[0]
            advertised=None if set(old)=={'0'} else old
            parents=tc.git('rev-list','--parents','-n','1',new).split()[1:]
            if parents!=([old] if advertised else []):
                raise tc.BoardError('Board changed; retry the CAS operation from current state')
            cached=tc.snapshot('origin')
            if not cached or cached.get('oid')!=advertised:
                tc.read_board('origin')
                cached=tc.snapshot('origin')
            if not cached or cached['ref']!=tc.REF:
                raise tc.BoardError('Do not recreate a second board ref')
            proposed=json.loads(tc.git('show',new+':state.json'))
            if not isinstance(proposed.get('tasks'),dict) or not isinstance(proposed.get('graph'),dict):
                raise tc.BoardError('Invalid board commit')
            # Git's advertised old OID and the explicit lease fence this write.
            # No remote read is needed inside the normal taskctl push hook.
            return
    if mode=='refs':
        if len(sys.argv)>2 and sys.argv[2]!='prepared':return
        ref_updates=[line.split() for line in sys.stdin if line.strip()]
        if not any(row[2].startswith('refs/heads/') for row in ref_updates):return
    branch=tc.git('branch','--show-current')
    if mode=='pre-commit':
        root_docs=[p for p in tc.git('ls-files','--cached').splitlines() if '/' not in p and p.lower().endswith('.md') and p not in ('README.md','AGENTS.md')]
        if root_docs:raise tc.BoardError('Move root Markdown into docs/: '+', '.join(root_docs))
    if bootstrap_enabled():
        try: board_oid,board=tc.read_board('origin')
        except tc.BoardError: board_oid,board=None,None
        if not board:
            return check_bootstrap(mode,branch,ref_updates,updates)
    if mode=='refs':
        try:board_oid,board=tc.cached_board('origin')
        except tc.BoardError:board_oid,board=tc.read_board('origin')
    else:board_oid,board=tc.read_board('origin')
    policy=op.policy_for(board) if board else None
    if mode=='refs':
        if len(sys.argv)>2 and sys.argv[2]!='prepared':return
        if not policy:return
        for old,new,ref in ref_updates:
            if not ref.startswith('refs/heads/'):continue
            name=ref[len('refs/heads/'):]
            if name=='main' and op.pending_preparation(board):continue
            if name in ('main','develop'):
                if set(new)=={'0'}:raise tc.BoardError('Shared branch deletion is forbidden')
                remote=tc.git('rev-parse','refs/remotes/origin/'+name)
                if new!=remote:raise tc.BoardError('Shared branches only fast-forward to origin; use a PR')
                if set(old)!={'0'} and subprocess.run(['git','merge-base','--is-ancestor',old,new],capture_output=True).returncode:raise tc.BoardError('Non-fast-forward shared branch change')
            elif set(new)!={'0'}:
                task=op.resolve_branch(board,name,check_github=False)
                state=board['tasks'][task]
                if state['status'] not in ('claimed','submitted'):raise tc.BoardError('Active claim required for branch changes')
                if set(old)=={'0'} and new!=state['base_commit']:raise tc.BoardError('Start the branch at the claimed develop base')
        return
    if mode=='pre-commit':
        if not board: raise tc.BoardError('Shared board missing')
        if policy and branch=='main' and op.pending_preparation(board):return
        check_commit(board,'HEAD',branch,True)
        return
    if updates is None:updates=[line.split() for line in sys.stdin if line.strip()]
    by_ref={row[2]:row for row in updates}
    # The migration is a single atomic push of the SAME commit and deletion of the old ref.
    if set(by_ref)=={tc.REF,tc.LEGACY_REF} and set(by_ref[tc.LEGACY_REF][1])=={'0'}:
        new=by_ref[tc.REF];old=by_ref[tc.LEGACY_REF]
        if new[1]!=board_oid or old[3]!=board_oid or set(new[3])!={'0'}:raise tc.BoardError('Board migration must preserve the exact current commit')
        if not board or any(s['status'] in ('claimed','submitted') for s in board['tasks'].values()):raise tc.BoardError('Active tasks prevent board migration')
        return
    deletions=[row for row in updates if set(row[1])=={'0'}]
    if deletions:
        if len(deletions)!=len(updates):raise tc.BoardError('Do not mix branch pruning with content pushes')
        plan_path=Path(tc.git('rev-parse','--git-common-dir')).resolve()/'taskctl/prune-plan.json'
        if not plan_path.is_file():raise tc.BoardError('Use tools/prune_branches.py to review merged branch deletion')
        plan=json.loads(plan_path.read_text())
        if not board or any(s['status'] in ('claimed','submitted') for s in board['tasks'].values()):raise tc.BoardError('Active tasks prevent branch deletion')
        tip=tc.git('ls-remote',plan['remote'],'refs/heads/main').split()[0]
        if tip!=plan['main']:raise tc.BoardError('Main changed after prune review')
        for _,_,ref,oid in deletions:
            if ref=='refs/heads/main' or not ref.startswith('refs/heads/') or plan['remoteBranches'].get(ref)!=oid:raise tc.BoardError('Deletion differs from reviewed branch plan')
            if subprocess.run(['git','merge-base','--is-ancestor',oid,tip],capture_output=True).returncode:raise tc.BoardError('Unmerged deletion rejected')
        return
    for local_ref,local_oid,remote_ref,remote_oid in updates:
        if remote_ref in (tc.REF,tc.LEGACY_REF):
            if remote_ref!=tc.board_ref('origin'):raise tc.BoardError('Do not recreate the legacy board branch')
            continue
        if policy and remote_ref in ('refs/heads/main','refs/heads/develop'):
            if remote_ref!='refs/heads/main' or not op.pending_preparation(board):raise tc.BoardError('No direct push to shared branches; merge a PR into develop')
            if set(local_oid)=={'0'} or subprocess.run(['git','merge-base','--is-ancestor',remote_oid,local_oid],capture_output=True).returncode:raise tc.BoardError('Only fast-forward preparation pushes to main are allowed')
            continue
        if remote_ref=='refs/heads/main':
            if set(remote_oid)=={'0'}: raise tc.BoardError('Bootstrap main before enabling hooks')
            if subprocess.run(['git','merge-base','--is-ancestor',remote_oid,local_oid],capture_output=True).returncode:
                raise tc.BoardError('Non-fast-forward main push rejected')
            if not board: raise tc.BoardError('Shared board missing')
            # Every new non-merge commit must be part of a submitted task.
            commits=tc.git('rev-list','--no-merges',f'{remote_oid}..{local_oid}').splitlines()
            submissions=[s['submitted_commit'] for s in board['tasks'].values() if s['status'] in ('submitted','done') and s.get('submitted_commit')]
            for commit in commits:
                if not any(subprocess.run(['git','merge-base','--is-ancestor',commit,head],capture_output=True).returncode==0 for head in submissions):
                    raise tc.BoardError('Unsubmitted commit in main integration: '+commit)
        elif remote_ref.startswith('refs/heads/'):
            if not board: raise tc.BoardError('Shared board missing')
            if policy and local_ref!=remote_ref:raise tc.BoardError('Push source and destination branch must match')
            check_commit(board,local_oid,remote_ref[len('refs/heads/'):])
        else: raise tc.BoardError('Push target must be a shared branch, owner/Issue-number-description, or the task board metadata ref')

if __name__=='__main__':
    try: main()
    except (tc.BoardError,ValueError,KeyError,OSError) as e:
        print('Production hook: '+str(e),file=sys.stderr);sys.exit(1)
