import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TransferStore } from './store.ts';
import { transferMigration } from '../../db/migrations/transfer/migration.ts';

const input = {
  id: 'recipe-1', title: '散歩して喫茶店で振り返る', meaning: '静かな探索の後に考えをまとめる',
  sourceRefs: [{ type: 'record', id: 'record-1', version: 2 }],
  steps: [
    { id: 'walk', meaning: '緑の中を歩く', sourceRecordIds: ['record-1'], stayMinutes: 20, required: true },
    { id: 'cafe', meaning: '静かに振り返る', sourceRecordIds: ['record-1'], stayMinutes: 30, required: true },
  ],
  requiredConditions: ['静かな場所'], allowedChanges: ['飲み物'],
};

test('recipe preserves ordered meaning and source versions across SQLite reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'transfer-'));
  const path = join(dir, 'db.sqlite');
  try {
    let db = new DatabaseSync(path); db.exec(transferMigration.sql);
    const store = new TransferStore(db);
    const recipe = store.createRecipe('alice', input);
    assert.equal(recipe.version, 1);
    assert.deepEqual(recipe.steps.map(s => s.id), ['walk', 'cafe']);
    db.close(); db = new DatabaseSync(path);
    assert.deepEqual(new TransferStore(db).getRecipe('alice', input.id), recipe);
    assert.throws(() => new TransferStore(db).getRecipe('bob', input.id), { code: 'NOT_FOUND' });
    db.close();
  } finally { rmSync(dir, { recursive: true }); }
});

test('recipe edit uses optimistic version and rejects unattached or duplicate steps', () => {
  const db = new DatabaseSync(':memory:'); db.exec(transferMigration.sql);
  const store = new TransferStore(db); store.createRecipe('alice', input);
  const replacement = { ...input, title: '次の体験', steps: [...input.steps].reverse() };
  const edited = store.replaceRecipe('alice', input.id, 1, replacement);
  assert.equal(edited.version, 2);
  assert.deepEqual(edited.steps.map(s => s.id), ['cafe', 'walk']);
  assert.throws(() => store.replaceRecipe('alice', input.id, 1, replacement), { code: 'VERSION_CONFLICT' });
  assert.throws(() => store.createRecipe('alice', { ...input, id: 'bad', steps: [input.steps[0], input.steps[0]] }), { code: 'VALIDATION_FAILED' });
  assert.throws(() => store.createRecipe('alice', { ...input, id: 'bad', steps: [{ ...input.steps[0], sourceRecordIds: ['not-a-source'] }] }), { code: 'VALIDATION_FAILED' });
  db.close();
});
