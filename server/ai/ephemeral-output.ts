import type { Readable } from 'node:stream';
import { aiError } from './errors.ts';
export async function collectAgentMessage(stream:Readable):Promise<string>{
 stream.setEncoding('utf8');
 let buffer='',final='',bytes=0;
 const consume=(line:string)=>{
  if(!line.trim())return;
  let event:any;try{event=JSON.parse(line);}catch{throw aiError('OUTPUT_INVALID','AIイベントがJSONではありません',true);}
  if(event.type==='item.completed'&&event.item?.type==='agent_message'){
   final=event.item.text;if(typeof final!=='string'||Buffer.byteLength(final)>256*1024)throw aiError('OUTPUT_INVALID','AI応答が256KiBを超えました',true);
  }
  if(event.type==='turn.failed'||event.type==='error')throw aiError('UPSTREAM_FAILED','一時AI実行が失敗しました',true);
 };
 for await(const chunk of stream){
  bytes+=Buffer.byteLength(chunk);if(bytes>4*1024*1024)throw aiError('OUTPUT_INVALID','AIイベント出力が上限を超えました',true);
  buffer+=chunk.toString();let end;
  while((end=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,end));buffer=buffer.slice(end+1);}
 }
 consume(buffer);return final;
}
