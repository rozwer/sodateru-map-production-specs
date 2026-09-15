import test from 'node:test';
import assert from 'node:assert/strict';
import { reflectionSchema } from './tasks.ts';

test('compare provider schema declares boolean while keeping rejected false',()=>{
 const schema=reflectionSchema('compareResult');
 assert.equal(schema.properties.mappings.items.properties.rejected.type,'boolean');
 assert.equal(schema.properties.mappings.items.properties.rejected.const,false);
});
