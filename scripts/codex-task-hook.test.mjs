import assert from 'node:assert/strict';
import test from 'node:test';

import { issueAuthorizationBranch } from './codex-task-hook.mjs';

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
