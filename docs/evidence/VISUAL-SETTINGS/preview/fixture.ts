// Browser-only visual inspection responses. Never imported by production screens.
const now = Date.now();
let person = {id:'visual-person',version:1,createdAt:now,updatedAt:now,name:'さやか',bio:'名古屋の本山で暮らしています。\nカフェや本、緑のある場所が好きです。\nこの地図で、日々のお気に入りを集めていきたいです。',avatarUrl:"/api/v1/me/icon"};
let settings = { id:'visual-person',version:1,createdAt:now,updatedAt:now,display:{fontSize:'standard',reduceMotion:false},location:{enabled:true,saveTrack:true},media:{photosEnabled:true,microphoneEnabled:true},ai:{enabled:true,allowRecords:true,allowLocation:true,allowMedia:false,allowProfile:false},notifications:{enabled:false,timing:'daily',dailyAt:'18:00',timeZone:'Asia/Tokyo'},retention:{recordsDays:null,trackDays:null},suggestions:{enabled:true,timing:'onOpen',summaryDays:90,stopped:[{placeId:'visual-motoyama',activity:'カフェで仕事'}]},profileVisibility:'private'};
const previewKey = 'visual-settings-191';
try { const saved = JSON.parse(sessionStorage.getItem(previewKey) || 'null'); if (saved) { person = saved.person; settings = saved.settings; } } catch {}
const persist = () => sessionStorage.setItem(previewKey, JSON.stringify({person,settings}));
export const requests: {method:string;path:string;body:unknown;version:string|null}[] = [];
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input), location.origin);
  if (!url.pathname.startsWith('/api/v1/')) return nativeFetch(input,options);
  const path = url.pathname.slice('/api/v1'.length); const method = options?.method || 'GET';
  const headers = new Headers(options?.headers);
  const body = typeof options?.body === 'string' ? JSON.parse(options.body) : null;
  requests.push({method,path,body,version:headers.get('If-Match')});
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json'}});
  if (sessionStorage.getItem('settings-preview-fail') === 'yes' && method === 'PATCH') return json({error:{code:'TEST_FAILURE',message:'検査用の通信失敗です。',requestId:'visual-request'}},500);
  if (path === '/me' && method === 'PATCH') { if (headers.get('If-Match') !== `"${person.version}"`) return json({error:{code:'VERSION_CONFLICT',message:'ほかの画面で更新されました。',requestId:'visual-request'}},412); person = {...person,...body,version:person.version+1,updatedAt:Date.now()}; }
  if (path === '/me/settings' && method === 'PATCH') { if (headers.get('If-Match') !== `"${settings.version}"`) return json({error:{code:'VERSION_CONFLICT',message:'ほかの画面で更新されました。',requestId:'visual-request'}},412); settings = {...settings,...body,version:settings.version+1,updatedAt:Date.now()}; }
  if (method === 'PATCH') persist();
  if (path === '/me/icon') return nativeFetch('https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=240&q=85');
  if (path === '/me') return json({data:person});
  if (path === '/me/settings') return json({data:settings});
  if (path === '/me/data') return json({data:{person,settings,categories:[{kind:'profile',label:'プロフィール',count:1,readUrl:'/me',exportUrl:'/me/settings/export',deletionPreviewUrl:null,deleteUrl:null,version:person.version,deletionEffect:'写真・名前・紹介を保存しています。'},{kind:'settings',label:'利用設定',count:1,readUrl:'/me/settings',exportUrl:'/me/settings/export',deletionPreviewUrl:null,deleteUrl:'/me/settings',version:settings.version,deletionEffect:'初期化は利用設定に適用されます。'},{kind:'records',label:'記録',count:0,readUrl:'/records',exportUrl:null,deletionPreviewUrl:null,deleteUrl:null,version:null,deletionEffect:'記録ごとに確認・削除できます。'}],recordActions:{exportTemplate:'/records/{recordId}/export',deletionPreviewTemplate:'/records/{recordId}/deletion-preview',deleteTemplate:'/records/{recordId}'}}});
  if (path === '/me/settings/export') return new Response('<!doctype html><meta charset="utf-8"><h1>検査応答：プロフィールと設定</h1><p>'+person.name+'</p>',{headers:{'Content-Type':'text/html'}});
  if (path === '/records' || path === '/visits') return json({items:[],nextCursor:null});
  if (path === '/places/visual-motoyama') return json({data:{place:{id:'visual-motoyama',name:'本山エリア'},photos:[{url:'https://images.unsplash.com/photo-1530632308350-e96d55f00e4a?auto=format&fit=crop&w=240&q=85',sourceUrl:'https://unsplash.com',attribution:'Unsplash',fetchedAt:now,verificationStatus:'unverified'}]}});
  return json({error:{code:'VISUAL_FIXTURE_ONLY',message:'この操作の検査応答は用意していません。実APIではありません。',requestId:'visual-request'}},501);
};
Object.assign(window, { settingsPreview: { requests, snapshot: () => ({person,settings}) } });
