import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { collectAgentMessage } from './ephemeral-output.ts';
test('decodes Japanese split inside UTF-8 code points and the final line without a newline',async()=>{
 const expected=JSON.stringify({text:'日本語の水辺'});
 const bytes=Buffer.from(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:expected}}));
 const chunks=Array.from(bytes,byte=>Buffer.from([byte]));
 assert.equal(await collectAgentMessage(Readable.from(chunks)),expected);
});
