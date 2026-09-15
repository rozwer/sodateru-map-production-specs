import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerSchema } from './provider-schema.ts';
test('provider schema drops unrelated tuple definitions and keeps recursively referenced definitions',()=>{
 const schema={type:'object',properties:{value:{$ref:'#/definitions/result'}},definitions:{result:{type:'array',items:{$ref:'#/definitions/item'}},item:{type:'string'},unusedCoordinates:{type:'array',items:[{type:'number'},{type:'number'}]}}};
 assert.deepEqual(providerSchema(schema),{...schema,definitions:{result:schema.definitions.result,item:schema.definitions.item}});
 assert.ok('unusedCoordinates' in schema.definitions);
});
