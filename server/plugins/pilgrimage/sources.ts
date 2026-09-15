import { CommonError } from '../../core/errors.ts';
import { coordinates, inRegion } from './validation.ts';
import type { Relation, SearchInput, Source, Work } from './types.ts';
const hidaUrl = 'https://www.hida-kankou.jp/courses/73';
const agent = 'SodateruMapPilgrimage/1.0 (https://github.com/rozwer/sodateru-map-production-specs)';
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s。.!！「」]/g,'');
async function request(url: string, signal: AbortSignal): Promise<Response> {
 try {
  const response = await fetch(url, {headers: {'User-Agent':agent, Accept:'application/json,text/html'}, signal:AbortSignal.any([signal,AbortSignal.timeout(20_000)])});
  if (!response.ok) throw new CommonError(response.status===429?'RATE_LIMITED':'PROVIDER_UNAVAILABLE','作品の出典を取得できません。',true,{provider:new URL(url).hostname});
  return response;
 } catch(error) { if (error instanceof CommonError) throw error; signal.throwIfAborted(); throw new CommonError('PROVIDER_UNAVAILABLE','作品の出典への通信に失敗しました。',true,{provider:new URL(url).hostname}); }
}
// Store our factual descriptions and source URLs only; never copy site prose or images.
const officialEntries = [
 {name:'飛騨市図書館',type:'related-facility',description:'作品に関する展示がある図書館。公式観光コースで紹介されています。',proof:['君の名は。','コーナー']},
 {name:'飛騨古川駅',type:'model-location',description:'公式観光コースが映画と駅周辺の風景との対応を紹介しています。',proof:['映画と同じ位置','跨線橋']},
 {name:'気多若宮神社',type:'model-location',description:'神社の階段と作品の聞き込み場面との対応を、公式観光サイトで確認できます。',proof:['聞き込み','モデルとなった場所']},
 {name:'落合バス停',type:'model-location',description:'作品のバス待ち場面のモデルとして、公式観光サイトが紹介しています。',proof:['バスを待って','モデルとなった場所']},
] as const;
async function hida(input: SearchInput, signal: AbortSignal) {
 const html = await (await request(hidaUrl,signal)).text(), fetchedAt=Date.now();
 const source:Source={url:hidaUrl,title:'飛騨市公式観光サイト「君の名は。」モデルコース',fetchedAt,claimScope:'relation',attribution:'飛騨市・事実を要約。本文・画像の転載なし'};
 const relations:Relation[]=[];
 for (const entry of officialEntries) {
  const section=html.split('<li class="timeline-spot"').find(s=>s.includes(`<div class="timeline-spot-title">${entry.name}</div>`))?.split('</li>')[0] ?? '';
  // The description follows an image list, so use the complete spot block for claim checks.
  const block=html.split('<li class="timeline-spot"').find(s=>s.includes(`<div class="timeline-spot-title">${entry.name}</div>`)) ?? section;
  const marker=[...html.matchAll(/markerData\.push\(\{([\s\S]*?)\}\);/g)].find(m=>m[1]!.includes(`name: '${entry.name}'`))?.[1];
  const latitude=marker?.match(/lat:\s*Number\('([\d.-]+)'\)/)?.[1], longitude=marker?.match(/lng:\s*Number\('([\d.-]+)'\)/)?.[1];
  const point=[Number(longitude),Number(latitude)];
  if(!latitude||!longitude||!coordinates(point)||!inRegion(point,input.region))continue;
  const confirmed=entry.proof.every(p=>block.includes(p));
  relations.push({id:`hida-${officialEntries.indexOf(entry)+1}`,workId:'Q21697406',name:entry.name,address:null,coordinates:point,relationType:entry.type,description:confirmed?entry.description:'公式ページの関係説明を再確認できません。',sourceRefs:[source,{...source,claimScope:'coordinates'}],verificationStatus:confirmed?'confirmed':'unverified',unknowns:confirmed?[]:['作品と地点の対応が掲載内容から再確認できません。']});
 }
 if(!relations.length && input.region.bounds[0]<137.2 && input.region.bounds[2]>137.1 && input.region.bounds[1]<36.3 && input.region.bounds[3]>36.2) throw new CommonError('OUTPUT_INVALID','公式出典の施設位置を読み取れません。');
 return {works:[{id:'Q21697406',title:'君の名は。',aliases:['Your Name','Kimi no Na wa']}],relations,fetchedAt,warnings:[],dataKind:'live' as const};
}
async function wikidataJson(params: Record<string,string>, signal: AbortSignal): Promise<any> {
 const url=new URL('https://www.wikidata.org/w/api.php');
 for(const [key,value] of Object.entries({format:'json',...params}))url.searchParams.set(key,value);
 const json=await (await request(url.href,signal)).json() as any;
 if(json.error)throw new CommonError('PROVIDER_UNAVAILABLE','作品データの取得元が要求を処理できません。',true);
 return json;
}
async function entities(ids:string[],signal:AbortSignal):Promise<Record<string,any>> {
 if(!ids.length)return {};
 const result=await wikidataJson({action:'wbgetentities',ids:ids.join('|'),props:'labels|aliases|claims',languages:'ja|en'},signal);
 if(!result.entities||typeof result.entities!=='object')throw new CommonError('OUTPUT_INVALID','作品データの形式が不正です。');
 return result.entities;
}
const label=(entity:any)=>entity.labels?.ja?.value??entity.labels?.en?.value??entity.id;
async function wikidata(input:SearchInput,signal:AbortSignal) {
 const found=input.workId?[{id:input.workId}]:(await wikidataJson({action:'wbsearchentities',search:input.workQuery,language:/[\u3000-\u9fff]/.test(input.workQuery)?'ja':'en',uselang:'ja',type:'item',limit:'5'},signal)).search;
 if(!Array.isArray(found))throw new CommonError('OUTPUT_INVALID','作品検索の形式が不正です。');
 const workEntities=await entities(found.map((v:any)=>v.id).filter((v:any)=>/^Q[1-9][0-9]*$/.test(v)),signal);
 const targets:{work:any;claim:any;property:string;target:string}[]=[];
 const works:Work[]=[];
 for(const work of Object.values(workEntities)) {
  if(work.missing!==undefined)continue;
  works.push({id:work.id,title:label(work),aliases:[...(work.aliases?.ja??[]),...(work.aliases?.en??[])].map((v:any)=>v.value).slice(0,20)});
  for(const property of ['P915','P840'])for(const claim of work.claims?.[property]??[]) {
   const target=claim.mainsnak?.datavalue?.value?.id;
   if(claim.rank!=='deprecated'&&/^Q[1-9][0-9]*$/.test(target))targets.push({work,claim,property,target});
  }
 }
 const locations=await entities([...new Set(targets.map(t=>t.target))].slice(0,50),signal),fetchedAt=Date.now(),relations:Relation[]=[];
 for(const {work,claim,property,target} of targets) {
  const place=locations[target];if(!place)continue;
  const coordinateClaim=place.claims?.P625?.find((c:any)=>c.rank!=='deprecated'&&c.mainsnak?.datavalue?.value?.globe==='http://www.wikidata.org/entity/Q2');
  const position=coordinateClaim?.mainsnak?.datavalue?.value,point=[position?.longitude,position?.latitude];
  if(!coordinates(point)||!inRegion(point,input.region))continue;
  const refs:Source[]=[{url:`https://www.wikidata.org/wiki/${work.id}#${property}`,title:`Wikidata: ${label(work)} (${property})`,fetchedAt,claimScope:'relation',attribution:'Wikidata CC0; community-maintained statements'}, {url:`https://www.wikidata.org/wiki/${target}#P625`,title:`Wikidata: ${label(place)} (coordinates)`,fetchedAt,claimScope:'coordinates',attribution:'Wikidata CC0'}];
  for(const ref of claim.references??[])for(const snak of ref.snaks?.P854??[]) {const url=snak.datavalue?.value;if(typeof url==='string'&&/^https?:\/\//.test(url))refs.push({url,title:'Wikidata記載の参考URL（本文未検証）',fetchedAt,claimScope:'relation',attribution:'本文未取得'});}
  relations.push({id:`${work.id}-${property}-${target}`,workId:work.id,name:label(place),address:null,coordinates:point,relationType:property==='P915'?'filming-location':'narrative-location',description:property==='P915'?'Wikidataに撮影場所として登録されています。独立した公式確認は未実施です。':'Wikidataに物語の舞台として登録されています。実際の撮影地・モデル地との一致は未確認です。',sourceRefs:refs,verificationStatus:'unverified',unknowns:['共同編集データの記載です。一次出典による作品と地点の対応は未確認です。']});
 }
 return {works,relations:[...new Map(relations.map(r=>[r.id,r])).values()],fetchedAt,warnings:relations.length?['未確認の関係を確定事実として扱わないでください。']:['指定地域で位置付きの作品関連データが見つかりません。作品・地域を変更してください。'],dataKind:'live' as const};
}
export async function searchSources(input:SearchInput,signal:AbortSignal) {
 if(input.workId==='Q21697406'||!input.workId&&['君の名は','yourname','kiminonawa'].includes(normalize(input.workQuery)))return hida(input,signal);
 return wikidata(input,signal);
}
