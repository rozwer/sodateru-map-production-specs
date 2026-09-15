"""Local-only contact registration; never acquires/releases a task or posts to GitHub."""
import os
from pathlib import Path
import subprocess
import sys

ROUTER_CLI = Path(__file__).with_name('issue_router.mjs')


def contact_registration(policy, task, command='register'):
    if not os.environ.get('CODEX_THREAD_ID') or not policy:
        return False
    number = policy.get('issue_numbers', {}).get(task)
    if not number:
        return False
    cli = ROUTER_CLI
    try:
        result = subprocess.run(
            ['node', str(cli), command, '--repo', policy['repository'], '--issue', str(number)],
            capture_output=True, text=True, encoding='utf-8', timeout=3)
        if result.returncode:
            # Idempotent cleanup is useful when finish is retried after an interrupted close.
            if command == 'unregister' and 'ENOENT' in result.stderr:
                return True
            raise RuntimeError(result.stderr.strip() or 'router failed')
        return True
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
        print('[issue-router] Contact registration only failed; task ownership is unchanged: '
              + str(error) + '. See .agents/skills/sodateru-issue-contact/SKILL.md.', file=sys.stderr)
        return False


def lock_contacts(board, policy, task, reason):
    """Use the already-fetched board; no extra remote read on a rejected claim."""
    if not policy:
        return []
    out = []
    for item in reason.split('; '):
        if not item.startswith('lock:'):
            continue
        blocked = item[5:]
        state = board.get('tasks', {}).get(blocked, {})
        number = policy.get('issue_numbers', {}).get(blocked)
        if not number or state.get('status') not in ('claimed', 'submitted'):
            continue
        out.append({'task': blocked, 'owner': state.get('owner') or state.get('actor'),
                    'issue': number,
                    'url': f"https://github.com/{policy['repository']}/issues/{number}",
                    'replyIssue': policy['issue_numbers'].get(task),
                    'instruction': 'Use the recipient GitHub login, not CODEX_OWNER, for @login Codex: on this Issue. Include your replyIssue and the conflicting path. Do not release their lock.'})
    return out
