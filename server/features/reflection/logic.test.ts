import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparisonErrors, comparisonResult, extractPatch, questionDisplay, comparisonConditions } from './logic.ts';

test('comparison preserves left/right and rejects invented or unrelated evidence; adoption never patches source body', () => {
  const input = { fromRecordIds: ['a'], toRecordIds: ['b'] };
  const evidence = [{ id:'src_1', recordId:'a' },{ id:'src_2', recordId:'b' },{ id:'src_3', recordId:'c' }];
  const mapping = { fromRecordId:'a',toRecordId:'b',relation:'different-place-same-role',explanation:'静かな休憩場所として使った',evidenceIds:['src_1','src_2'],rejected:false };
  assert.deepEqual(comparisonErrors({mappings:[mapping]},input,evidence),[]);
  assert.ok(comparisonErrors({mappings:[{...mapping,fromRecordId:'b',toRecordId:'a'}]},input,evidence).length);
  assert.ok(comparisonErrors({mappings:[{...mapping,evidenceIds:['src_3']}]},input,evidence).length);
  assert.deepEqual(comparisonResult({mappings:[]}),{common:[],differences:[],unknown:['比較できる根拠が不足しています']});
  assert.deepEqual(extractPatch({purpose:'休憩',reason:'静かだった',context:{},body:'AI本文'},['purpose']),{purposes:['休憩']});
});

test('changed/deleted evidence hides generated question quotes while preserving independent answer and state', () => {
 const q={questionText:'削除前の原文を引用した質問',answerText:'本人が保存した回答',status:'answered'};
 const changed=questionDisplay(q,[{state:'changed'}]);
 assert.equal(changed.questionText,null);assert.equal(changed.evidenceState,'changed');
 assert.equal(changed.answerText,q.answerText);assert.equal(changed.status,'answered');
 const gone=questionDisplay(q,[{state:'current'},{state:'unavailable'}]);
 assert.equal(gone.questionText,null);assert.equal(gone.evidenceState,'unavailable');
 assert.equal(questionDisplay(q,[{state:'current'}]).questionText,q.questionText);
});
test('AI comparison identity includes the meaningful request and preserves ordered sides', () => {
 const input={fromRecordIds:['b','a'],toRecordIds:['z']};
 assert.deepEqual(comparisonConditions(input,'静かさ'),{fromRecordIds:['a','b'],toRecordIds:['z'],text:'静かさ'});
 assert.notDeepEqual(comparisonConditions(input,'静かさ'),comparisonConditions(input,'用途'));
 assert.notDeepEqual(comparisonConditions(input,'静かさ'),comparisonConditions({fromRecordIds:['z'],toRecordIds:['a','b']},'静かさ'));
});
