import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { TransferStore } from './store.ts';
import { transferMigration } from '../../db/migrations/transfer/migration.ts';
import { transferFragment } from './schemas.ts';

test('Q10 fragment references compile with shared schemas and real SQLite DTOs match', () => {
  const base = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json',import.meta.url),'utf8'));
  const schemas = {...base.components.schemas,...transferFragment.schemas};
  const ajv = new Ajv({strict:false,allErrors:true}); addFormats(ajv);
  ajv.addSchema({$id:'contract',components:{schemas}});
  for(const name of Object.keys(transferFragment.schemas))assert.ok(ajv.getSchema(`contract#/components/schemas/${name}`),name);
  const db = new DatabaseSync(':memory:'); db.exec(transferMigration.sql);
  const store = new TransferStore(db);
  const recipe = store.createRecipe('person',{id:'r',title:'散策',meaning:'緑',sourceRefs:[{type:'record',id:'record',version:1}],steps:[{id:'s',meaning:'公園',sourceRecordIds:['record'],stayMinutes:10,required:true}],requiredConditions:[],allowedChanges:[]});
  const plan = store.createPlan('person',{id:'p',recipeId:recipe.id,recipeVersion:recipe.version,region:'東京',start:{longitude:139,latitude:35},mode:'walking',timeBudgetMinutes:60,preferences:''},recipe);
  for(const [schema,value] of [['TransferRecipe',recipe],['TransferPlanSet',plan]] as const) {
    const valid=ajv.getSchema(`contract#/components/schemas/${schema}`)!;
    assert.equal(valid(value),true,JSON.stringify(valid.errors));
  }
  db.close();
});
