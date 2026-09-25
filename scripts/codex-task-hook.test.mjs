import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectShell, issueAuthorizationBranch } from './codex-task-hook.mjs';

test('comments use the posting Task branch for cross-owner contact', () => {
  assert.equal(
    issueAuthorizationBranch('comment', '3', 'mattsun/35-companion', 'mattsun'),
    'mattsun/35-companion',
  );
});

for (const action of ['edit', 'close', 'reopen']) {
  test(`${action} keeps the target Issue owner check`, () => {
    assert.equal(
      issueAuthorizationBranch(action, '3', 'mattsun/35-companion', 'mattsun'),
      'mattsun/3-issue',
    );
  });
}

test('inline JSON Task claim uses the existing guarded worktree entry', () => {
  const definition = JSON.stringify({ id: "EXAMPLE", issue_number: 304 });
  const command = `mise run task:worktree -- EXAMPLE /tmp/example --slug example --definition-json '${definition}'`;
  assert.doesNotThrow(() => inspectShell(command, '/nonexistent-staging-worktree', 'mattsun'));
});
