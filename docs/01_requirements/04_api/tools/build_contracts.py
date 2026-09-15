"""Generate reviewable API documents and OpenAPI from one contract source.
Run at repository root: mise exec -- python3 docs/01_requirements/04_api/tools/build_contracts.py
"""
import json, re, copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
S={}
def st(lo=0,hi=10000): return dict(type='string',minLength=lo,maxLength=hi)
def en(*xs): return dict(type='string',enum=list(xs))
def integer(lo=0,hi=9007199254740991): return dict(type='integer',minimum=lo,maximum=hi)
def num(lo=0,hi=1e15): return dict(type='number',minimum=lo,maximum=hi)
def arr(s,lo=0,hi=1000,unique=False): return dict(type='array',items=copy.deepcopy(s),minItems=lo,maxItems=hi,**({'uniqueItems':True} if unique else {}))
def obj(p,required=None): return dict(type='object',properties=copy.deepcopy(p),required=list(p) if required is None else required,additionalProperties=False)
def ref(n): return {'$ref':'#/components/schemas/'+n}
def null(s): return {'anyOf':[copy.deepcopy(s),{'type':'null'}]}
def add(n,s): S[n]=s; return ref(n)
def field(s,desc): return {**copy.deepcopy(s),'description':desc}
ID=add('Id',st(1,80)); VER=add('Version',integer(1)); TS=add('Timestamp',integer(-8640000000000000,8640000000000000))
DATE=add('Date',dict(type='string',format='date')); TZ=add('TimeZone',field(st(1,80),'IANA timezone。実在する値をサーバーで検査する。'))
BOOL={'type':'boolean'}; TEXT=st(); NAME=st(1,200); URL=dict(type='string',format='uri',maxLength=2048)
LOC=add('Position',obj({'longitude':num(-180,180),'latitude':num(-90,90)}))
WP=add('Waypoint',obj({'lng':num(-180,180),'lat':num(-90,90),'placeId':ID},['lng','lat']))
GEOM=add('LineString',obj({'type':{'const':'LineString'},'coordinates':{'type':'array','minItems':2,'maxItems':100000,'items':{'type':'array','prefixItems':[num(-180,180),num(-90,90)],'items':False,'minItems':2,'maxItems':2}}}))
SHARE=en('private','selected','public'); PREC=en('exact','approximate','unknown')
REF=add('SourceRef',obj({'type':en('record','visit','place','checkin','route'),'id':ID,'version':VER}))
REFS=arr(REF,0,1000,True)
META={'id':ID,'version':VER,'createdAt':TS,'updatedAt':TS}
B={}; DB={}; CREATE={}; PATCH={}
def resource(name,db,props,create=None,patch=None):
 B[name]={**META,**props}; DB[name]=db; add(name,obj(B[name]))
 if create is not None:
  CREATE[name]=list(create); add(name+'Create',obj({'id':ID,**{k:props[k] for k in create}}))
 if patch:
  PATCH[name]=list(patch); add(name+'Patch',{**obj({k:props[k] for k in patch},[]),'minProperties':1})
resource('Person','00_people',{'name':NAME,'bio':TEXT,'avatarUrl':null(URL)},None,['name','bio','avatarUrl'])
resource('Place','01_places',{'name':NAME,'longitude':num(-180,180),'latitude':num(-90,90),'address':null(TEXT),'provider':NAME,'externalId':null(ID),'buildingKey':null(st(1,400)),'sourceUrl':null(URL),'attribution':TEXT,'fetchedAt':null(TS)},None,['name','address','buildingKey'])
resource('Visit','15_visits',{'personId':ID,'placeId':ID,'startedAt':null(TS),'endedAt':null(TS),'timePrecision':PREC,'origin':en('manual','gps'),'status':en('candidate','confirmed','rejected')},['placeId','startedAt','endedAt','timePrecision','origin'],['placeId','startedAt','endedAt','timePrecision','status'])
ACT=add('Activity',obj({'id':ID,'name':NAME,'purpose':null(TEXT),'outcome':null(TEXT),'satisfaction':null(en('met','partial','not_met')),'repeatIntent':null(BOOL)}))
ANS=add('PeriodAnswers',obj({k:null(BOOL) for k in ['detour','newPlace','rest','alone','longStay','farTrip']},[]))
rprops={'personId':ID,'kind':en('experience','diary','memo'),'visitId':null(ID),'placeId':null(ID),'occurredAt':null(TS),'endedAt':null(TS),'timePrecision':PREC,'body':TEXT,'purposes':arr(NAME,0,100,True),'activities':arr(ACT,0,100),'impression':TEXT,'periodAnswers':ANS,'bookmarked':BOOL,'useForSuggestions':BOOL,'topicKey':null(ID),'visibility':SHARE,'sharedWith':arr(ID,0,100,True)}
resource('Record','02_records',rprops,[k for k in rprops if k!='personId'],[k for k in rprops if k not in ['personId','kind']])
resource('Media','03_media',{'recordId':ID,'kind':en('photo','video','audio'),'mimeType':en('image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','audio/mp4','audio/wav'),'byteSize':integer(1,52428800),'position':integer(0,999),'status':en('pending','ready','failed'),'contentUrl':st(1,400)},None,None)
resource('Conversation','04_conversations',{'personId':ID,'purpose':en('consult','reflection','analysis','comparison'),'title':NAME,'recordId':null(ID)},['purpose','title','recordId'],['title'])
resource('Message','05_messages',{'conversationId':ID,'position':integer(),'role':en('user','assistant'),'body':TEXT,'status':en('pending','running','complete','failed','cancelled'),'attempt':integer(1),'model':null(NAME),'errorCode':null(NAME),'insightId':null(ID),'sourceRefs':REFS},None,None)
LEG=add('RouteLeg',obj({'mode':en('walking','cycling','driving','transit'),'from':WP,'to':WP,'distanceM':num(),'durationSec':num(),'line':null(TEXT),'departureAt':null(TS),'arrivalAt':null(TS),'fare':null(num()),'additionalFare':null(num())},['mode','from','to','distanceM','durationSec']))
ROUTE=add('RouteData',obj({'geometry':null(GEOM),'legs':arr(LEG,0,99)}))
resource('SavedRoute','06_saved_routes',{'personId':ID,'title':NAME,'waypoints':arr(WP,2,100),'route':ROUTE,'distanceM':null(num()),'durationSec':null(integer()),'provider':null(NAME),'sourceUrl':null(URL),'fetchedAt':null(TS),'status':en('saved','navigating','finished'),'currentLeg':integer(0,98),'visibility':SHARE,'sharedWith':arr(ID,0,100,True)},None,None)
# Plugin definitions supply the only deliberately open object. Runtime validation is mandatory.
SETTINGS=add('PluginValues',{'type':'object','additionalProperties':True,'description':'選択したPluginDefinition.settingsSchemaで追加検証必須。定義未提供のpluginIdは導入不可。'})
resource('PluginSetting','07_plugin_settings',{'enabled':BOOL,'settings':SETTINGS},['enabled','settings'],['enabled','settings'])
resource('FeatureRequest','08_feature_requests',{'personId':ID,'title':NAME,'body':TEXT,'visibility':en('private','public')},['title','body','visibility'],['title','body','visibility'])
resource('TrackPoint','09_track_points',{'personId':ID,'segmentId':ID,'sourcePointId':ID,'observedAt':TS,'longitude':num(-180,180),'latitude':num(-90,90),'accuracyM':num(0,100000)},['segmentId','sourcePointId','observedAt','longitude','latitude','accuracyM'],None)
SEG=add('TransitSegment',obj({'lineId':ID,'fromStopId':ID,'toStopId':ID}))
resource('TransitPass','10_transit_passes',{'personId':ID,'operator':NAME,'segments':arr(SEG,1,100),'validFrom':DATE,'validTo':DATE},['operator','segments','validFrom','validTo'],['operator','segments','validFrom','validTo'])
CHECK=add('CheckinAnswers',obj({'state':TEXT,'wishes':arr(NAME,0,100,True),'minutes':null(integer(0,1440)),'note':TEXT}))
resource('SelfCheckin','11_self_checkins',{'personId':ID,'localDate':DATE,'answers':CHECK,'validUntil':TS},['localDate','answers','validUntil'],['localDate','answers','validUntil'])
COND=add('SuggestionConditions',obj({'minutes':integer(0,1440),'budget':integer(0,1000000),'mode':en('walking','cycling','driving','transit'),'activity':NAME,'note':TEXT},[]))
resource('Suggestion','12_suggestions',{'personId':ID,'placeId':ID,'batchId':ID,'position':integer(),'title':NAME,'activity':NAME,'reason':TEXT,'conditions':COND,'checkinId':null(ID),'sourceRefs':REFS,'status':en('offered','later','dismissed','selected','completed','not_done'),'presentedAt':null(TS),'selectedAt':null(TS),'expiresAt':TS,'routeId':null(ID),'completedVisitId':null(ID),'feedback':TEXT},None,None)
resource('Theme','13_themes',{'personId':ID,'name':NAME,'description':TEXT,'recordIds':arr(ID,0,1000,True)},['name','description','recordIds'],['name','description','recordIds'])
resource('Friendship','14_friendships',{'requesterId':ID,'recipientId':ID,'status':en('pending','accepted')},['recipientId'],None)
AXIS=add('AnalysisAxis',obj({'key':en('detour','newPlace','rest','alone','longStay','farTrip'),'numerator':integer(),'denominator':integer(),'value':null(num(0,1)),'unknownDays':integer()}))
ANALYSIS=add('AnalysisResult',obj({'axes':arr(AXIS,0,6),'unknown':arr(TEXT)}))
COMPARE=add('ComparisonResult',obj({'common':arr(TEXT),'differences':arr(TEXT),'unknown':arr(TEXT)}))
resource('Insight','16_insights',{'personId':ID,'kind':en('analysis','comparison'),'inputKey':NAME,'sourceRefs':REFS,'rangeStart':null(TS),'rangeEnd':null(TS),'timeZone':TZ,'generatorVersion':NAME,'model':null(NAME),'summary':TEXT,'result':{'oneOf':[ANALYSIS,COMPARE]},'review':null(en('agree','disagree','unsure','edit')),'reviewNote':null(TEXT),'reviewedAt':null(TS)},None,['review','reviewNote'])
add('RecordView',obj({**B['Record'],'effectivePlaceId':null(ID),'effectiveStartedAt':null(TS),'effectiveEndedAt':null(TS),'effectiveTimePrecision':PREC}))
ERRCODE=en('INVALID_REQUEST','UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','STATE_CONFLICT','IDEMPOTENCY_CONFLICT','INPUT_CHANGED','RESULT_EXPIRED','VERSION_CONFLICT','VERSION_REQUIRED','VALIDATION_FAILED','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE','RATE_LIMITED','UPSTREAM_FAILED','UNAVAILABLE','TIMEOUT','INTERNAL_ERROR','NOT_READY')
ERROR=add('Error',obj({'code':ERRCODE,'message':TEXT,'requestId':ID,'details':obj({'currentVersion':VER,'fields':arr(obj({'path':st(1,300),'reason':TEXT}),1,100),'retryAfterSec':integer(1)},[])},['code','message','requestId']))
add('ErrorEnvelope',obj({'error':ERROR}))
def page(n):
 name=n+'Page'
 if name not in S: add(name,obj({'items':arr(ref(n),0,100),'nextCursor':null(st(1,2048))}))
 return ref(name)
def section(schema): return {'oneOf':[obj({'status':{'const':'ready'},'data':schema}),obj({'status':{'const':'failed'},'error':ERROR})]}
add('RecordDetail',obj({'record':ref('RecordView'),'media':section(page('Media'))}))
add('SharedRecord',obj({'record':ref('RecordView'),'author':ref('Person'),'place':null(ref('Place')),'media':section(page('Media'))}))
add('PlaceDetail',obj({'place':ref('Place'),'facilities':section(page('Place')),'visits':section(page('Visit')),'records':section(page('RecordView')),'sharedRecords':section(page('SharedRecord'))}))
add('Candidate',obj({'candidateId':ID,'placeId':null(ID),'name':NAME,'position':LOC,'address':null(TEXT),'provider':NAME,'externalId':null(ID),'sourceUrl':null(URL),'attribution':TEXT,'fetchedAt':TS}))
add('CandidateResult',obj({'resultId':ID,'expiresAt':TS,'items':arr(ref('Candidate'),0,10)}))
add('PlaceCreate',{'oneOf':[obj({'id':ID,'mode':{'const':'candidate'},'resultId':ID,'candidateId':ID}),obj({'id':ID,'mode':{'const':'manual'},'name':NAME,'position':LOC,'address':null(TEXT),'buildingKey':null(st(1,400))})]})
add('GrowthItem',obj({'place':ref('Place'),'confirmedVisitCount':integer(),'purposes':arr(NAME,0,100,True),'sourceRefs':REFS}))
add('MapRecord',obj({'recordId':ID,'personId':ID,'placeId':ID,'position':LOC}))
add('Voice',obj({'record':ref('RecordView'),'author':ref('Person'),'media':section(page('Media'))}))
add('RouteSearchResult',obj({'resultId':ID,'expiresAt':TS,'waypoints':arr(WP,2,100),'route':ROUTE,'distanceM':num(0.001),'durationSec':integer(1),'provider':NAME,'sourceUrl':null(URL),'fetchedAt':TS}))
add('RouteSearchInput',obj({'waypoints':arr(WP,2,100),'mode':en('walking','cycling','driving','transit'),'departureAt':TS,'timeZone':TZ,'transitPassIds':arr(ID,0,20,True)}))
add('SavedRouteCreate',obj({'id':ID,'title':NAME,'resultId':ID,'visibility':SHARE,'sharedWith':arr(ID,0,100,True)}))
add('SavedRoutePatch',{**obj({'title':NAME,'resultId':ID,'status':en('saved','navigating','finished'),'currentLeg':integer(0,98),'visibility':SHARE,'sharedWith':arr(ID,0,100,True)},[]),'minProperties':1})
add('SuggestionBatchInput',obj({'id':ID,'checkin':null(REF),'origin':LOC,'conditions':COND,'excludedActivities':arr(NAME,0,100,True),'excludedPlaceIds':arr(ID,0,100,True),'expiresAt':TS}))
add('SuggestionBatch',obj({'id':ID,'items':arr(ref('Suggestion'),0,20)}))
add('SuggestionPatch',{**obj({'status':en('offered','later','dismissed','selected','completed','not_done'),'presented':{'const':True},'routeId':null(ID),'completedVisitId':null(ID),'feedback':TEXT},[]),'minProperties':1})
add('MediaUpload',obj({'id':ID,'file':{'type':'string','format':'binary'},'position':integer(0,999)}))
add('MediaOrderInput',obj({'items':arr(obj({'id':ID,'version':VER}),0,1000,True)}))
add('VersionedId',obj({'id':ID,'version':VER}))
add('TrackDelete',obj({'segmentId':null(ID),'from':TS,'to':TS,'targets':arr(ref('VersionedId'),1,1000,True)}))
add('DeletedCount',obj({'deletedCount':integer(0,1000)}))
add('SourceLookupInput',obj({'refs':arr(REF,1,100,True)}))
source_out=[]
for type_name,res in [('record','RecordView'),('visit','Visit'),('place','Place'),('checkin','SelfCheckin'),('route','SavedRoute')]:
 source_out.append(obj({'type':{'const':type_name},'id':ID,'requestedVersion':VER,'status':en('current','changed'),'current':ref(res)}))
source_out.append(obj({'type':en('record','visit','place','checkin','route'),'id':ID,'requestedVersion':VER,'status':{'const':'unavailable'}}))
add('SourceLookup',obj({'items':arr({'oneOf':source_out},1,100)}))
add('DailyReflection',obj({'date':DATE,'timeZone':TZ,'from':TS,'to':TS,'visits':section(page('Visit')),'records':section(page('RecordView')),'checkins':section(page('SelfCheckin'))}))
add('Summary',obj({'from':TS,'to':TS,'timeZone':TZ,'result':ANALYSIS,'sourceRefs':REFS}))
# AI contract distinguishes transport from unresolved generation policy/storage.
STYLE=add('MapStyle',obj({'theme':en('normal','light','monochrome'),'light':en('dawn','day','dusk','night'),'pedestrianRoads':BOOL,'administrativeBoundaries':BOOL,'indoor':BOOL,'colors':obj({k:{'type':'string','pattern':'^#[0-9a-fA-F]{6}$'} for k in ['water','green','road','building']})}))
contexts={
 'consult':obj({'origin':LOC,'originLabel':en('current-location','map-center'),'selection':null(obj({'resultId':ID,'candidateId':ID}))}),
 'extract':obj({'record':REF,'additionalAnswer':TEXT}),
 'diary':obj({'date':DATE,'timeZone':TZ,'recordRefs':arr(REF,1,100)}),
 'analysis':obj({'from':TS,'to':TS,'timeZone':TZ}),
 'comparison':obj({'left':REF,'right':REF,'timeZone':TZ}),
 'theme-name':obj({'recordRefs':arr(REF,1,100)}),
 'map-style':obj({'current':STYLE}),
 'discovery':obj({'placeId':null(ID),'buildingKey':null(st(1,400)),'mediaId':null(ID),'features':arr(NAME,1,100)})}
add('MessageSend',{'oneOf':[obj({'userMessageId':ID,'assistantMessageId':ID,'body':st(1,10000),'use':{'const':k},'context':v}) for k,v in contexts.items()]})
add('MessageAccepted',obj({'userMessage':ref('Message'),'assistantMessage':ref('Message'),'statusUrl':st(1,400)}))
add('MessageRetry',obj({'attempt':integer(1)}))
outputs={
 'consult':obj({'text':TEXT,'candidates':null(ref('CandidateResult')),'route':null(ref('RouteSearchResult')),'origin':LOC,'originLabel':en('current-location','map-center')}),
 'extract':obj({'purposes':arr(NAME,0,100),'reason':TEXT,'situation':TEXT,'sourceRefs':REFS,'question':null(TEXT)}),
 'diary':obj({'body':TEXT,'sourceRefs':REFS}),
 'analysis':obj({'insightId':ID}),
 'comparison':obj({'insightId':ID}),
 'theme-name':obj({'name':NAME,'description':TEXT,'sourceRefs':REFS}),
 'map-style':obj({'proposed':STYLE,'explanation':TEXT}),
 'discovery':obj({'targetPlaceId':null(ID),'connection':TEXT,'knowledge':TEXT,'question':TEXT,'concepts':arr(NAME),'sources':arr(obj({'url':URL,'title':NAME,'kind':en('general','observed')}),0,100)})}
add('AIOutput',{'oneOf':[obj({'use':{'const':k},'value':v}) for k,v in outputs.items()]})
add('MessageResult',obj({'message':ref('Message'),'output':null(ref('AIOutput'))}))
add('RetryAccepted',obj({'message':ref('Message'),'statusUrl':st(1,400)}))
add('PluginDefinition',obj({'id':ID,'name':NAME,'description':TEXT,'settingsSchema':{'type':'object','additionalProperties':True,'description':'JSON Schema 2020-12。各プラグインの定義を参照する。'},'installed':null(ref('PluginSetting'))}))

# Operation catalog. Every query/body/response is explicit; no generic CRUD writable DTO.
OPS=[]
COMMON_ERR={400:'INVALID_REQUEST',401:'UNAUTHENTICATED',403:'FORBIDDEN',404:'NOT_FOUND',500:'INTERNAL_ERROR'}
Q={
 'cursor':st(1,2048), 'limit':{**integer(1,100),'default':50},'q':st(1,200),'placeId':ID,'themeId':ID,'personId':ID,
 'from':TS,'to':TS,'timeZone':TZ,'date':DATE,
 'bbox':{'type':'string','pattern':r'^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$','description':'west,south,east,north。経度±180、緯度±90、west<east、south<north。日付変更線をまたぐ場合は二要求へ分ける。'},
 'longitude':num(-180,180),'latitude':num(-90,90),'radiusM':num(1,100000),
 'purpose':NAME,'visibility':SHARE,'segmentId':ID,'batchId':ID,'topicKey':ID,'buildingKey':st(1,400)}
def query(names,required=(),overrides=None):
 d={k:copy.deepcopy(Q[k]) for k in names.split()}; d.update(overrides or {})
 return [{'name':k,'in':'query','required':k in required,'schema':v} for k,v in d.items()]
def op(group,method,path,title,out=None,body=None,qs=None,code=200,rule='',write='',access='本人',err=None,etag=False,blocked=(),sort=None,ctype='application/json'):
 o=dict(group=group,method=method,path=path,title=title,out=out,body=body,query=qs or [],code=code,rule=rule,write=write or 'なし',access=access,err={**COMMON_ERR,**(err or {})},etag=etag,blocked=list(blocked),sort=sort,ctype=ctype)
 if body: o['err'][422]='VALIDATION_FAILED'
 if method!='GET': o['err'][409]='STATE_CONFLICT'
 if method in ['PATCH','DELETE'] or etag: o['err'].update({412:'VERSION_CONFLICT',428:'VERSION_REQUIRED'})
 OPS.append(o)
R='参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。'
G='根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。'
VL='startedAtとendedAtは終了が開始以上。unknownは両方null。終了のみの指定不可。'
REC='visitIdありならkind=experience、placeId/occurredAt/endedAt=null、timePrecision=unknown。同じ本人の訪問だけ参照する。visitIdなしでは直接場所・日時を使う。'
SH='visibility=selectedはsharedWithが1人以上。private/publicは空配列。人物の存在と重複を検査する。'
PAGE='cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。'
EXT={410:'RESULT_EXPIRED',422:'VALIDATION_FAILED',429:'RATE_LIMITED',502:'UPSTREAM_FAILED',503:'UNAVAILABLE',504:'TIMEOUT'}
# places
op(1,'GET','/places','保存済み場所一覧',page('Place'),qs=query('q bbox buildingKey cursor limit'),sort='name ASC, id ASC',rule=PAGE)
op(1,'GET','/place-candidates','場所候補検索',ref('CandidateResult'),qs=query('q longitude latitude bbox',overrides={'category':en('coffee','restaurant','bakery','park')}),rule='qまたはcategoryの一方を必須。categoryではlongitude/latitudeを両方必須。保存済み検索→外部検索の順で取得。検索だけではplacesへ保存しない。resultIdは本人ごとに15分保持し最大6件。',err=EXT,blocked=['Q03'])
op(1,'POST','/places','候補採用・手動登録',ref('Place'),ref('PlaceCreate'),code=201,rule='candidateでは本人・期限を確認しprovider+externalIdで照合。既存なら200でそのPlaceを返す。manualはprovider=manual、externalId/sourceUrl/fetchedAt=null、attributionは空文字。要求IDと既存IDが異なる場合も返却されたIDを使う。',write='places',err=EXT)
op(1,'GET','/places/{placeId}','場所詳細',ref('PlaceDetail'),rule='places取得失敗は全体404。同じ非nullのbuildingKeyで施設を束ねる。各一覧は最大50件で続きを返す。visits/records/sharedRecordsのcursorは対応する一覧APIで使う。facilitiesはGET /placesのbuildingKey条件で続く。')
op(1,'PATCH','/places/{placeId}','場所情報・建物対応の訂正',ref('Place'),ref('PlacePatch'),rule='共有のplacesを編集する権限を先に決める。外部取得項目の手修正・再取得時の優先順位はQ03。',write='places',access='場所管理権限（未確定）',blocked=['Q03'])
op(1,'GET','/map/growth','本人の地図成長材料',page('GrowthItem'),qs=query('bbox cursor limit'),sort='place.id ASC',rule='本人のconfirmedな訪問IDを場所別に数える。purposesはその訪問のrecordsから重複を除く。成長段階や3D外観の決定規則は画面仕様で定義する。',blocked=['Q11'])
# visits
op(2,'GET','/visits','訪問一覧',page('Visit'),qs=query('placeId from to cursor limit',overrides={'status':en('candidate','confirmed','rejected')}),sort='startedAt DESC NULLS LAST, id DESC',rule=PAGE+' 時間条件はstartedAtへ適用し、nullは期間指定時に除外する。')
op(2,'POST','/visits','訪問候補登録',ref('Visit'),ref('VisitCreate'),code=201,rule=R+VL+' status=candidateをサーバーが設定。',write='visits')
op(2,'GET','/visits/{visitId}','訪問単体取得',ref('Visit'),rule=R)
op(2,'PATCH','/visits/{visitId}','訪問確認・訂正・否定',ref('Visit'),ref('VisitPatch'),rule=R+VL+' candidate/confirmed/rejected間の本人操作による遷移を許す。confirmedでなくなった場合、または提案先と場所が一致しなくなった場合は参照提案をselectedへ戻しcompletedVisitId=null。',write='visitsと該当suggestionsを同一トランザクションで更新')
op(2,'DELETE','/visits/{visitId}','訪問削除',code=204,rule=R+' 記録のvisitIdをnullにし、直接の場所・日時は未指定のまま本文を残す。達成提案はselectedへ戻す。',write='visits削除、関連recordsとsuggestionsの更新')
# records
op(2,'GET','/records','本人記録一覧',page('RecordView'),qs=query('placeId themeId from to cursor limit',overrides={'kind':en('experience','diary','memo')}),sort='effectiveStartedAt DESC NULLS LAST, id DESC',rule=REC+PAGE+' 期間条件は実効開始日時へ適用し、nullは期間指定時に除外。')
op(2,'POST','/records','記録保存',ref('RecordView'),ref('RecordCreate'),code=201,rule=REC+' occurredAt/endedAtは終了≧開始、unknownは両方null。終了のみは不可。'+SH+' activities.idは記録内一意。希望不明ならpurpose/satisfaction=null。サーバーはAI出力を勝手に反映しない。',write='records')
op(2,'GET','/records/{recordId}','記録詳細',ref('RecordDetail'),rule=REC+' 読めない記録は404。媒体一覧は記録IDに属する媒体だけをposition ASC,id ASCで返す。',access='本人または現在の共有先・公開閲覧者')
op(2,'PATCH','/records/{recordId}','記録編集・共有変更',ref('RecordView'),ref('RecordPatch'),rule=REC+' occurredAt/endedAtは終了≧開始、unknownは両方null。終了のみは不可。'+SH+' 省略値は保持し、変更後の全体へ制約を適用。本文の編集とAI案の採用は本人の送信項目だけを反映。',write='records')
op(2,'DELETE','/records/{recordId}','記録削除',code=204,rule='本文・添付media・全themesの所属IDを削除。visitsは保持。依存する生成結果は以後表示しない。',write='records、media削除、themes更新')
op(2,'GET','/records/{recordId}/media','添付一覧',page('Media'),qs=query('cursor limit'),sort='position ASC, id ASC',rule='親記録の閲覧権限を検査。ready/failed/pendingを返すが実体の表示はreadyだけ。',access='親記録の閲覧可能者')
op(2,'POST','/records/{recordId}/media','媒体添付',ref('Media'),ref('MediaUpload'),code=201,etag=True,ctype='multipart/form-data',rule='If-Matchは親記録の版。MIMEを内容で検証し1ファイル最大50 MiB。JPEG/PNG/WebPはphoto、MP4はvideo、MPEG/MP4/WAV音声はaudio。保存済みpositionは409。ファイル保存後に親の版を再検査しmedia追加と親の版増加を原子的に行う。失敗時は未参照実体を清掃。',write='media、records.version、媒体ファイル',err={413:'PAYLOAD_TOO_LARGE',415:'UNSUPPORTED_MEDIA_TYPE'})
op(2,'POST','/records/{recordId}/media/reorder','添付順序の一括変更',page('Media'),ref('MediaOrderInput'),etag=True,rule='If-Matchは親記録。itemsは現在の全媒体ID・版を漏れなく各1回指定。配列順をposition=0から採用し一意制約を一括更新。版不一致は412で全件変更しない。最大100件を返し、続きは添付一覧。',write='mediaのposition/version、親records.version')
op(2,'GET','/media/{mediaId}','媒体情報',ref('Media'),rule='親記録の閲覧権限を確認。storageKeyは返さずcontentUrlを返す。',access='親記録の閲覧可能者')
op(2,'GET','/media/{mediaId}/content','媒体実体',{'type':'string','format':'binary'},rule='取得ごとに親記録の現在権限を確認。ready以外は409 NOT_READY。Cache-Control: private, no-store。Range配信はQ06で定義するまで受理せず全体200。',access='親記録の閲覧可能者',err={409:'NOT_READY'},ctype='binary')
op(2,'DELETE','/media/{mediaId}','添付削除',code=204,rule='If-Matchはmediaの版。親記録の所有者だけが削除。親版も増加し未参照実体を清掃。',write='media削除、records.version更新')
op(2,'GET','/track-points','位置観測一覧',page('TrackPoint'),qs=query('segmentId from to cursor limit'),sort='observedAt ASC, id ASC',rule=R+PAGE+' from/toはobservedAtへ適用。')
op(2,'POST','/track-points','位置観測一括追加',obj({'items':arr(ref('TrackPoint'),1,1000)}),obj({'items':arr(ref('TrackPointCreate'),1,1000)}),rule='人物とsourcePointIdの組で同一観測へ収束。既存と観測内容が同じなら既存ID、異なるなら409で全体rollback。検査・保存は全件一括。観測を訪問確認へ自動変換しない。',write='track_points')
op(2,'GET','/track-points/{pointId}','位置観測単体取得',ref('TrackPoint'),rule=R)
op(2,'POST','/track-points/delete-range','位置観測の選択区間削除',ref('DeletedCount'),ref('TrackDelete'),rule='from<to。targetsは同じ本人で期間内、segmentId非nullなら同区間。全ID・版を照合し不一致は412で全体rollback。送信後に追加された未指定点は削除しない。',write='指定track_points削除',err={412:'VERSION_CONFLICT'})
# conversations
op(3,'GET','/conversations','会話一覧',page('Conversation'),qs=query('cursor limit',overrides={'purpose':en('consult','reflection','analysis','comparison')}),sort='updatedAt DESC, id DESC',rule=R+PAGE)
op(3,'POST','/conversations','会話作成',ref('Conversation'),ref('ConversationCreate'),code=201,rule=R,write='conversations')
op(3,'GET','/conversations/{conversationId}','会話単体取得',ref('Conversation'),rule=R)
op(3,'PATCH','/conversations/{conversationId}','会話題名変更',ref('Conversation'),ref('ConversationPatch'),rule=R,write='conversations')
op(3,'DELETE','/conversations/{conversationId}','会話削除',code=204,rule='会話とmessagesを削除。保存済みinsightsは保持。実行中の応答は取消信号を送り、削除後の遅着書込みを防ぐ。',write='conversations、messages')
op(3,'GET','/conversations/{conversationId}/messages','発言一覧',page('MessageResult'),qs=query('cursor limit'),sort='message.position ASC, message.id ASC',rule=R+G+PAGE,blocked=['Q04'])
op(3,'POST','/conversations/{conversationId}/messages','AI送信受付',ref('MessageAccepted'),ref('MessageSend'),code=202,rule='userはcomplete、assistantはpending/attempt=1。会話のpositionを原子的に採番して一組を保存し、会話versionも増加。本人ごとに実行中は1件、追加は409。受け付けたuse/context、元本文、参照版の保存契約はQ04。analysis/comparisonは完了時にinsightsへ保存しinsightIdで参照。日記・体験・テーマ・地図設定へ自動適用しない。',write='messages、conversations、分析・比較時はinsights',err=EXT,blocked=['Q04','Q05'])
op(3,'GET','/messages/{messageId}','発言状態と用途別結果',ref('MessageResult'),rule=R+G+' userと未完了assistantではoutput=null。completeのassistantではuseに一致するAIOutputを返す。出力の保存と再取得はQ04。',blocked=['Q04'])
op(3,'POST','/messages/{messageId}/cancel','AI取消',ref('Message'),ref('MessageRetry'),etag=True,rule='assistantのみ。attemptを照合。pending/runningは先にcancelledを保存して取消信号を送る。complete/failed/cancelledは状態を変えず返す。遅着応答はid/attempt/runningが一致しなければ破棄。',write='messages',blocked=['Q04'])
op(3,'POST','/messages/{messageId}/retry','AI再試行',ref('RetryAccepted'),ref('MessageRetry'),code=202,etag=True,rule='assistantのfailed/cancelledだけ許可。同じIDのattemptを1増やしてpendingへ戻しerrorCode=null、bodyは空へ。元の本文・use/contextを使い材料の最新版と権限を読み直す。実行中または完了済みは409。再送の同一キーは二度attemptを増やさない。',write='messages',err=EXT,blocked=['Q04','Q05'])
# reflection
op(4,'GET','/reflection/days/{date}','日別振り返り',ref('DailyReflection'),qs=query('timeZone',required=['timeZone']),rule='dateの現地0時以上、翌日0時未満へ変換。visitsはstartedAt、recordsは実効開始日時、checkinsはlocalDateで取得。各領域の先頭50件とcursorを返し、対応一覧APIで続く。媒体は記録詳細または添付一覧から読む。')
for name,path,param,query_names,sort,rule in [
 ('SelfCheckin','self-checkins','checkinId','date cursor limit','localDate DESC, createdAt DESC, id DESC','validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。'),
 ('Theme','themes','themeId','cursor limit','updatedAt DESC, id DESC','recordIdsは本人の記録のみで一意。一度の編集で全配列を更新。記録自体の削除はしない。')]:
 op(4,'GET','/'+path,name+'一覧',page(name),qs=query(query_names),sort=sort,rule=R+PAGE+(' dateはlocalDateと一致。' if name=='SelfCheckin' else ''))
 op(4,'POST','/'+path,name+'作成',ref(name),ref(name+'Create'),code=201,rule=R+rule,write=DB[name])
 op(4,'GET','/'+path+'/{'+param+'}',name+'単体取得',ref(name),rule=R)
 op(4,'PATCH','/'+path+'/{'+param+'}',name+'編集',ref(name),ref(name+'Patch'),rule=R+rule,write=DB[name])
 op(4,'DELETE','/'+path+'/{'+param+'}',name+'削除',code=204,rule=R+('提案のcheckinIdをnullにする。依存結果は根拠照合で無効化。' if name=='SelfCheckin' else '含まれるrecordsは保持。'),write=DB[name])
op(4,'GET','/reflection/summary','期間集計',ref('Summary'),qs=query('from to timeZone',required=['from','to','timeZone']),rule='from<to。IANA timezoneで日付を区切る。分子≦分母、分母0ならvalue=null。各軸の判定規則と同日の回答重複時の集約はQ05。',blocked=['Q05'])
op(4,'GET','/insights','分析・比較一覧',page('Insight'),qs=query('from to cursor limit',overrides={'kind':en('analysis','comparison')}),sort='createdAt DESC, id DESC',rule=R+G+PAGE+' from/toはcreatedAtへ適用。')
op(4,'GET','/insights/{insightId}','分析・比較詳細',ref('Insight'),rule=R+G+' 元の入力版が変更済みなら409 INPUT_CHANGED、削除・非公開化なら404。',err={409:'INPUT_CHANGED'})
op(4,'PATCH','/insights/{insightId}','分析への判断・訂正',ref('Insight'),ref('InsightPatch'),rule=R+G+' review非nullならreviewedAtをサーバー時刻へ。review=nullならreviewNote/reviewedAtもnull。判断は同じ結果IDへ保存し元の記録を変更しない。',write='insights')
op(4,'DELETE','/insights/{insightId}','分析結果削除',code=204,rule=R+' messages.insightIdをnullにする。',write='insights削除、messagesの参照解除')
op(4,'POST','/source-refs/resolve','根拠の現行内容と版を取得',ref('SourceLookup'),ref('SourceLookupInput'),rule='入力順で各根拠を返す。読める同版はcurrent、別版はchanged。削除と権限不足は区別せずunavailableで本文や現行版を返さない。DBは変更しない。',access='各対象の現在の閲覧権限')
# routes
op(5,'POST','/suggestion-batches','提案候補生成',ref('SuggestionBatch'),ref('SuggestionBatchInput'),code=201,rule='checkin非nullならtype=checkinで本人・version・validUntilを照合。expiresAtは処理時刻より後。候補はoffered、未提示、completedVisitId=nullで保存。全候補を一括保存し空ならitems=[]。候補の適合・順序・処理期限はQ05。再取得はsuggestionsのbatchId条件。',write='suggestions',err=EXT,blocked=['Q05'])
op(5,'GET','/suggestions','提案一覧',page('Suggestion'),qs=query('batchId cursor limit',overrides={'status':en('offered','later','dismissed','selected','completed','not_done')}),sort='createdAt DESC, batchId ASC, position ASC, id ASC',rule=R+G+PAGE)
op(5,'GET','/suggestions/{suggestionId}','提案詳細',ref('Suggestion'),rule=R+G)
op(5,'PATCH','/suggestions/{suggestionId}','提案の提示・選択・達成',ref('Suggestion'),ref('SuggestionPatch'),rule='状態遷移表に従う。presented=trueで初回presentedAtのみ保存。selectedへ初遷移した時刻をselectedAtへ。completedは同じ本人・場所のconfirmed訪問を指定。それ以外はcompletedVisitId=null。routeIdは本人ルートのみ。期限後の新規選択・達成は409。',write='suggestions')
op(5,'POST','/route-searches','経路取得',ref('RouteSearchResult'),ref('RouteSearchInput'),rule='placeIdがある地点は保存済み座標と照合。道路上の形状と正の距離・所要時間を検査し、取得時刻から15分本人に束縛して結果を保持。区間の合計を維持。非対応modeは422。transit・運賃・曲がり角はQ07。',err=EXT,blocked=['Q07'])
op(5,'GET','/saved-routes','本人の保存ルート一覧',page('SavedRoute'),qs=query('cursor limit'),sort='updatedAt DESC, id DESC',rule=R+PAGE)
op(5,'POST','/saved-routes','ルート保存',ref('SavedRoute'),ref('SavedRouteCreate'),code=201,rule=SH+' 本人の有効なresultIdから経路・出典・地点順をコピー。status=saved,currentLeg=0。場所IDの参照を保存直前にも照合。外部結果をクライアント入力で置換しない。',write='saved_routes',err={410:'RESULT_EXPIRED'})
op(5,'GET','/saved-routes/{routeId}','保存ルート詳細',ref('SavedRoute'),rule='現在の共有権限を確認し保存した地点順・経路・状態を返す。',access='本人または現在の共有先・公開閲覧者')
op(5,'PATCH','/saved-routes/{routeId}','ルート編集・案内・共有',ref('SavedRoute'),ref('SavedRoutePatch'),rule=SH+' resultId指定時は本人の有効な結果で地点・経路を一緒に置換、status=saved,currentLeg=0へ。status/currentLegとの同時指定は422。案内開始は経路がありfetchedAtから15分以内。currentLegはlegsの添字。状態遷移表に従う。',write='saved_routes',err={410:'RESULT_EXPIRED'})
op(5,'DELETE','/saved-routes/{routeId}','ルート削除',code=204,rule='該当suggestions.routeIdをnullへ変更。',write='saved_routes削除、suggestions更新')
op(5,'GET','/transit-passes','定期券一覧',page('TransitPass'),qs=query('cursor limit'),sort='validFrom DESC, id DESC',rule=R+PAGE)
op(5,'POST','/transit-passes','定期券登録',ref('TransitPass'),ref('TransitPassCreate'),code=201,rule=R+' validFrom≦validToで実在日。終了日を含む。segmentsの交通ID照合先はQ07。',write='transit_passes',blocked=['Q07'])
op(5,'GET','/transit-passes/{passId}','定期券単体取得',ref('TransitPass'),rule=R)
op(5,'PATCH','/transit-passes/{passId}','定期券編集',ref('TransitPass'),ref('TransitPassPatch'),rule=R+' 有効終了日≧開始日。交通IDの照合はQ07。',write='transit_passes',blocked=['Q07'])
op(5,'DELETE','/transit-passes/{passId}','定期券削除',code=204,rule=R,write='transit_passes')
# sharing
op(6,'GET','/me','本人プロフィール',ref('Person'),rule='認証層の本人IDからpeopleを取得。初回作成方法はQ01。')
op(6,'PATCH','/me','本人プロフィール編集',ref('Person'),ref('PersonPatch'),rule='avatarUrlは外部URLの保存案。内部ファイルの任意パスを受け付けない。アイコンアップロード導線はQ06。',write='people',blocked=['Q06'])
op(6,'GET','/people','人物検索',page('Person'),qs=query('q cursor limit'),sort='name ASC, id ASC',rule=PAGE+' qはnameの部分一致。プロフィールの公開範囲はQ01。',blocked=['Q01'])
op(6,'GET','/people/{personId}','人物プロフィール',ref('Person'),rule='表示可能なプロフィールの範囲はQ01。',blocked=['Q01'])
op(6,'GET','/friendships','友人関係・申請一覧',page('Friendship'),qs=query('cursor limit',overrides={'status':en('pending','accepted')}),sort='updatedAt DESC, id DESC',rule='本人がrequester/recipientのどちらかである行。'+PAGE)
op(6,'POST','/friendships','友人申請',ref('Friendship'),ref('FriendshipCreate'),code=201,rule='requesterは本人、recipientは別の実在人物。逆方向も含む既存の組は409。status=pending。',write='friendships')
op(6,'GET','/friendships/{friendshipId}','友人関係単体取得',ref('Friendship'),rule='当事者のみ。他人の関係は404。')
op(6,'PATCH','/friendships/{friendshipId}','友人申請承認',ref('Friendship'),obj({'status':{'const':'accepted'}}),rule='recipient本人だけがpending→acceptedへ変更。acceptedへの再指定は版が一致すれば無変更200。',write='friendships',access='申請先本人')
op(6,'DELETE','/friendships/{friendshipId}','申請取消・拒否・友人解除',code=204,rule='pendingはrequesterが取消、recipientが拒否。acceptedはどちらも解除可。sharedWithへの波及はQ08で決める。',write='friendships',access='関係の当事者',blocked=['Q08'])
shared_query=query('q personId placeId bbox longitude latitude radiusM purpose from to visibility cursor limit')
shared_rule='本人投稿、public、またはselectedで本人がsharedWithに含まれる投稿を対象。qは場所名・住所・本文・人物表示名の部分一致。purposeはpurposesの完全一致。期間は実効開始日時。longitude/latitude/radiusMは3項目同時。bboxと距離条件はAND。位置なし投稿は位置条件指定時に除外。'+PAGE
op(6,'GET','/shared-records','共有投稿検索',page('SharedRecord'),qs=shared_query,sort='record.effectiveStartedAt DESC NULLS LAST, record.id DESC',rule=shared_rule,access='現在閲覧可能な記録')
op(6,'GET','/shared-records/map','同じ共有検索の地図表示',page('MapRecord'),qs=shared_query,sort='effectiveStartedAt DESC NULLS LAST, recordId DESC',rule=shared_rule+' 条件一致して位置がある全件をページ分割。位置なし投稿は地図項目に含めない。UIは全ページを読み一覧の先頭100件で打ち切らない。',access='現在閲覧可能な記録')
op(6,'GET','/places/{placeId}/voices','地域の声',page('Voice'),qs=query('topicKey cursor limit'),sort='record.createdAt DESC, record.id DESC',rule='同じ実効的な場所、topicKey非nullの本人・閲覧可能共有記録。話題指定時は完全一致。本文は原文を返す。投稿はrecordsの保存・共有変更を使う。',access='現在閲覧可能な記録')
op(6,'GET','/shared-routes','共有ルート一覧',page('SavedRoute'),qs=query('personId visibility cursor limit'),sort='updatedAt DESC, id DESC',rule='本人またはpublicまたはselectedで本人が共有先のルート。'+PAGE,access='現在閲覧可能なルート')
# plugins
op(7,'GET','/plugins','導入可能プラグイン一覧',obj({'items':arr(ref('PluginDefinition'),0,1000)}),rule='コード上の定義と保存済み導入状態を突合。定義順、同順ならid ASC。固有定義はQ09。',blocked=['Q09'])
op(7,'GET','/plugin-settings','導入済み設定一覧',page('PluginSetting'),qs=query('cursor limit'),sort='id ASC',rule='設定の適用範囲・編集権限はQ09。',blocked=['Q09'])
op(7,'POST','/plugin-settings','プラグイン導入',ref('PluginSetting'),ref('PluginSettingCreate'),code=201,rule='idは定義ID。未知の定義は404。settingsをその定義のSchemaで検証し、既存導入は409。同一キーの再送だけ元結果を返す。',write='plugin_settings',blocked=['Q09'])
op(7,'GET','/plugin-settings/{pluginId}','導入設定詳細',ref('PluginSetting'),rule='権限はQ09。',blocked=['Q09'])
op(7,'PATCH','/plugin-settings/{pluginId}','設定・有効状態の変更',ref('PluginSetting'),ref('PluginSettingPatch'),rule='settingsはオブジェクト全体の置換。定義のSchemaで検証。無効化では設定値を保持し、該当レイヤーをUIから外す。',write='plugin_settings',blocked=['Q09'])
op(7,'DELETE','/plugin-settings/{pluginId}','導入設定削除',code=204,rule='設定行のみ削除し記録・場所・ルートは保持。UIは該当表示を外す。',write='plugin_settings',blocked=['Q09'])
op(7,'GET','/feature-requests','機能要望一覧',page('FeatureRequest'),qs=query('personId cursor limit',overrides={'visibility':en('private','public')}),sort='createdAt DESC, id DESC',rule='本人またはpublicのみ。personId/visibilityで絞り込む。'+PAGE,access='本人または公開閲覧者')
op(7,'POST','/feature-requests','機能要望投稿',ref('FeatureRequest'),ref('FeatureRequestCreate'),code=201,rule='personIdは本人。title/body/visibilityを保存。',write='feature_requests')
op(7,'GET','/feature-requests/{requestId}','機能要望詳細',ref('FeatureRequest'),rule='本人またはpublicのみ。',access='本人または公開閲覧者')
op(7,'PATCH','/feature-requests/{requestId}','機能要望編集・公開変更',ref('FeatureRequest'),ref('FeatureRequestPatch'),rule=R,write='feature_requests')
op(7,'DELETE','/feature-requests/{requestId}','機能要望削除',code=204,rule=R,write='feature_requests')
import sys
sys.dont_write_bytecode=True
from align_common import align
align(globals())

# Add DB column explanations to resource fields (transport aliases are intentional).
ALIASES={'avatar_path':'avatarUrl','timezone':'timeZone'}
def camel(col):
 col=col.removesuffix('_json'); return ALIASES.get(col,re.sub(r'_([a-z])',lambda m:m[1].upper(),col))
for name,stem in DB.items():
 source=json.loads((ROOT.parent/'01_DB'/f'{stem}.json').read_text())
 common=json.loads((ROOT.parent/'01_DB'/'common.json').read_text())
 for col,definition in {**common['columns'],**source['columns']}.items():
  key=camel(col); desc=definition.get('description','')
  for schema_name in [name,name+'Create',name+'Patch','RecordView' if name=='Record' else name]:
   props=S.get(schema_name,{}).get('properties',{})
   if key in props: props[key]['description']=desc
# Common limits are deliberate draft choices, distinct from already fixed DB semantics.
for n,s in S.items():
 if n in DB: s['description']=f'保存結果DTO。列の意味は ../01_DB/{DB[n]}.json。API別名・非公開項目はschemas/README.md。'
# Stable samples illustrate shape, not actual runtime or product acceptance.
EX={
 'Id':'record-001','Version':1,'Timestamp':1789430400000,'Date':'2026-09-15','TimeZone':'Asia/Tokyo',
 'Position':{'longitude':136.9066,'latitude':35.1815},
 'Waypoint':{'lng':136.9066,'lat':35.1815},
 'LineString':{'type':'LineString','coordinates':[[136.9066,35.1815],[136.9076,35.1825]]},
 'PluginValues':{},
 'SourceRef':{'type':'record','id':'record-001','version':1}}
def sample(s,key=''):
 if '$ref' in s:
  n=s['$ref'].split('/')[-1]
  return copy.deepcopy(EX[n]) if n in EX else sample(S[n],key)
 if 'const' in s: return s['const']
 if 'enum' in s: return s['enum'][0]
 if 'anyOf' in s:
  if any(x.get('type')=='null' for x in s['anyOf']): return None
  return sample(s['anyOf'][0],key)
 if 'oneOf' in s: return sample(s['oneOf'][0],key)
 if 'allOf' in s: return sample(s['allOf'][0],key)
 typ=s.get('type')
 if isinstance(typ,list):
  if 'null' in typ: return None
  typ=typ[0]
 if typ=='object':
  required=list(s.get('required',[]))
  if not required and s.get('minProperties',0): required=list(s.get('properties',{}))[:s['minProperties']]
  return {k:sample(v,k) for k,v in s.get('properties',{}).items() if k in required}
 if typ=='array':
  if 'prefixItems' in s: return [sample(x) for x in s['prefixItems']]
  return [sample(s['items']) for _ in range(s.get('minItems',0))]
 if typ=='boolean': return False
 if typ in ['integer','number']: return max(0,s.get('minimum',0),s.get('exclusiveMinimum',-1)+1)
 if typ=='null': return None
 if s.get('format')=='date': return '2026-09-15'
 if s.get('format')=='uri': return 'https://example.com/source'
 if s.get('format')=='binary': return '(binary file)'
 if s.get('pattern','').startswith('^#'): return '#3478ab'
 return {'name':'本山のカフェ','title':'散歩の記録','body':'本を読んで過ごした。','reason':'条件に合う候補。','statusUrl':'/api/v1/messages/assistant-001','contentUrl':'/api/v1/media/media-001/content'}.get(key,'x'*max(1,s.get('minLength',0)))
# Domain-consistent specimen values; no real person or server response is asserted.
visit_data=sample(S['Visit']); visit_data.update(id='visit-001',personId='person-001',placeId='place-001',startedAt=1789430400000,endedAt=1789434000000,timePrecision='exact',status='confirmed')
EX['Visit']=visit_data
EX['VisitCreate']={k:visit_data[k] for k in S['VisitCreate']['properties']}
record_data=sample(S['Record']); record_data.update(id='record-001',personId='person-001',kind='experience',visitId=None,placeId='place-001',occurredAt=1789430400000,endedAt=1789434000000,timePrecision='exact',body='本を読んで過ごした。',impression='落ち着けた。',purposes=['読書'],visibility='private',sharedWith=[])
EX['Record']=record_data
EX['RecordCreate']={k:record_data[k] for k in S['RecordCreate']['properties']}
EX['RecordView']={**record_data,'effectivePlaceId':'place-001','effectiveStartedAt':1789430400000,'effectiveEndedAt':1789434000000,'effectiveTimePrecision':'exact'}
EX['RecordPatch']={'body':'本を読んだ後、友人と話した。','impression':'気分転換になった。'}
check_data=sample(S['SelfCheckin']); check_data.update(id='checkin-001',personId='person-001',validUntil=1789516800000,answers={'state':'少し疲れている','wishes':['休みたい'],'minutes':20,'note':''})
EX['SelfCheckin']=check_data
EX['SelfCheckinCreate']={k:check_data[k] for k in S['SelfCheckinCreate']['properties']}
EX['TrackDelete']={'segmentId':'segment-001','from':1789430400000,'to':1789434000000,'targets':[{'id':'point-001','version':1}]}
insight_data=sample(S['Insight']); insight_data.update(id='insight-001',personId='person-001',inputKey='sample-input-key',rangeStart=1789430400000,rangeEnd=1789516800000,summary='休息を記録した日は1日です。',generatorVersion='analysis-v1',result={'axes':[{'key':'rest','numerator':1,'denominator':1,'value':1,'unknownDays':0}],'unknown':[]})
EX['Insight']=insight_data
EX['Summary']={'from':1789430400000,'to':1789516800000,'timeZone':'Asia/Tokyo','result':insight_data['result'],'sourceRefs':[EX['SourceRef']]}
message_data=sample(S['Message']); message_data.update(id='user-001',conversationId='conversation-001',role='user',body='近くで休める場所を探して。',status='complete',attempt=1,model=None,errorCode=None,insightId=None,sourceRefs=[])
EX['Message']=message_data
EX['MessageResult']={'message':message_data,'run':None,'output':None}
assistant_data={**message_data,'id':'assistant-001','role':'assistant','position':1,'body':'','status':'pending'}
EX['MessageAccepted']={'userMessage':message_data,'assistantMessage':assistant_data,'statusUrl':'/api/v1/messages/assistant-001'}
EX['RetryAccepted']={'message':{**assistant_data,'attempt':2},'statusUrl':'/api/v1/messages/assistant-001'}
# Reuse shared examples so mapped request/result specimens do not invent different geometry or facts.
for directory,prefix in {'01_ai':'CommonAI','02_places-routes':'CommonMap','03_information':'CommonInfo'}.items():
 for case in json.loads((ROOT.parent/'02_common'/directory/'examples.json').read_text()):
  if case.get('valid') is True and 'schema' in case and 'data' in case:
   EX.setdefault(prefix+case['schema'],copy.deepcopy(case['data']))
for target,source in {'Place':'CommonMapPlace','PlaceDetail':'CommonInfoPlaceDetail','RouteSearchInput':'CommonMapRouteRequest','SavedRoute':'CommonMapSavedRoute'}.items():
 if source in EX: EX[target]=copy.deepcopy(EX[source])
if 'CommonMapRoutePreview' in EX:
 EX['RouteSearchResult']=copy.deepcopy(EX['CommonMapRoutePreview']);EX['RouteSearchResult']['resultId']=EX['RouteSearchResult'].pop('previewId')
if 'CommonAIRunRequest' in EX:
 run=EX['CommonAIRunRequest'];use={'compare':'comparison','theme':'theme-name','mapstyle':'map-style','discover':'discovery'}.get(run['task'],run['task'])
 EX['MessageSend']={'userMessageId':run['userMessageId'],'assistantMessageId':run['assistantMessageId'],'body':run['text'],'use':use,'context':run['input'],'expectedRefs':run['expectedRefs']}
GROUPS={1:('01_places','地図・場所'),2:('02_records','訪問・記録・媒体'),3:('03_conversations','会話・AI'),4:('04_reflection','振り返り・分析・テーマ'),5:('05_routes','提案・経路'),6:('06_sharing','人物・共有'),7:('07_plugins','拡張機能')}
# Publish only reachable schemas, including the named shared error envelope.
used={'ErrorEnvelope'}
def refs_in(value):
 if isinstance(value,list):
  for child in value: refs_in(child)
 elif isinstance(value,dict):
  link=value.get('$ref','')
  if link.startswith('#/components/schemas/'):
   name=link.split('/')[-1]
   if name not in used:
    used.add(name);refs_in(S[name])
  for child in value.values(): refs_in(child)
refs_in(S['ErrorEnvelope'])
for operation in OPS:
 for key in ['out','body','query']: refs_in(operation[key])
S={k:v for k,v in S.items() if k in used}

O={'openapi':'3.1.0','info':{'title':'育てる地図 本番API契約案','version':'0.2.0','description':'実装済みAPIではない。認証方式(Q01)を全操作の未解決依存として持つ。操作固有の未解決依存はx-open-questionsを参照。'},'jsonSchemaDialect':'https://json-schema.org/draft/2020-12/schema','servers':[{'url':'/api/v1'}],'paths':{},'components':{'schemas':S},'x-authentication-status':'Q01: 未確定。securityの未記載は公開APIを意味しない。'}
EMPTY={'description':'本文なし'}
ERROR_TEXT={400:'要求形式が不正',401:'本人を確認できない',403:'操作権限なし',404:'対象なし、または存在を開示しない',409:'現在状態と操作が競合',410:'一時結果の期限切れ',412:'版が不一致',413:'本文・ファイルが上限超過',415:'媒体形式が対象外',422:'項目・関連・状態条件が不正',428:'If-Matchがない',429:'実行頻度の上限',500:'予期しない失敗',502:'外部サービスの応答不正',503:'実行環境を利用できない',504:'処理期限を超過',416:'Range指定が範囲外または複数',501:'移動種別などが未対応'}
for ix,o in enumerate(OPS,1):
 o['id']=f"{GROUPS[o['group']][0].split('_')[0]}-{sum(1 for prev in OPS[:ix] if prev['group']==o['group']):02d}"
 operation_id=o['method'].lower()+''.join(p[:1].upper()+p[1:] for p in re.findall('[A-Za-z0-9]+',o['path']))
 o['operationId']=operation_id
 params=[{'name':p,'in':'path','required':True,'schema':DATE if p=='date' else ID} for p in re.findall(r'{([^}]+)}',o['path'])]+copy.deepcopy(o['query'])
 if o['method']=='POST': params.append({'name':'Idempotency-Key','in':'header','required':True,'schema':st(1,128),'description':'本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。'})
 if o['method'] in ['PATCH','DELETE'] or o['etag']: params.append({'name':'If-Match','in':'header','required':True,'schema':{'type':'string','pattern':'^"[1-9][0-9]*"$'},'description':'対象の版。媒体添付・一括順序変更は親記録の版。'})
 params.append({'name':'X-Request-Id','in':'header','required':True,'schema':{'type':'string','format':'uuid'},'description':'新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。'})
 if o['path']=='/media/{mediaId}/content': params.append({'name':'Range','in':'header','required':False,'schema':st(1,200),'description':'単一bytes範囲。複数・不正・範囲外は416。'})
 status=str(o['code']); responses={}
 if o['out']:
  payload=o['out'] if (o['ctype']=='binary' or 'Page' in o['out'].get('$ref','') or o['path'] in ['/plugins']) else obj({'data':o['out']})
  # All list shapes retain the canonical items/cursor shape; special batch responses use data.
  o['payload']=payload
  media='application/octet-stream' if o['ctype']=='binary' else 'application/json'
  responses[status]={'description':'成功。本文は下記Schema。','content':{media:{'schema':payload}}}
  if o['ctype']!='binary': responses[status]['content'][media]['example']=sample(payload)
  if o['ctype']=='binary':
   responses[status]['content']={t:{'schema':o['out']} for t in S['Media']['properties']['mimeType']['enum']}
  if 'version' in S.get(o['out'].get('$ref','').split('/')[-1],{}).get('properties',{}) or o['out'].get('$ref','').split('/')[-1] in ['RecordView','RecordDetail','PlaceDetail','MessageResult']:
   responses[status].setdefault('headers',{})['ETag']={'schema':{'type':'string','pattern':'^"[1-9][0-9]*"$'},'description':'単体または複合詳細の主資源の版。'}
  if o['code']==201:
   responses[status].setdefault('headers',{})['Location']={'schema':st(1,500),'description':'作成した単体取得先。提案集合は /api/v1/suggestions?batchId={id}。'}
  if o['path'] in ['/places','/saved-routes','/insights'] and o['method']=='POST': responses['200']=copy.deepcopy(responses['201']); responses['200']['description']='providerとexternalIdが既存場所に一致。返した既存IDを使う。'
 else: responses[status]=copy.deepcopy(EMPTY)
 if o['path']=='/media/{mediaId}/content':
  responses['200'].setdefault('headers',{}).update({'Content-Length':{'schema':integer()},'Accept-Ranges':{'schema':{'const':'bytes'}},'Content-Disposition':{'schema':{'const':'inline'}}})
  responses['206']=copy.deepcopy(responses['200']); responses['206']['description']='単一Rangeの指定範囲。'
  responses['206']['headers']['Content-Range']={'schema':st(1,200),'description':'bytes 開始-終了/全体サイズ'}
 for code,c in o['err'].items():
  codes=[c]
  if code==422: codes=list(dict.fromkeys(codes+['VALIDATION_FAILED','OUTPUT_INVALID','ROUTE_NOT_FOUND']))
  if code==409: codes=list(dict.fromkeys(codes+['STATE_CONFLICT','INPUT_CHANGED','BUSY','SOURCE_CHANGED','REQUEST_CONFLICT']+(['IDEMPOTENCY_CONFLICT'] if o['method']=='POST' else [])))
  err_schema=copy.deepcopy(S['Error']); err_schema['properties']['code']=en(*codes)
  error_payload=obj({'error':err_schema})
  responses[str(code)]={'description':ERROR_TEXT[code],'content':{'application/json':{'schema':error_payload,'example':{'error':{'code':c,'message':ERROR_TEXT[code],'requestId':'123e4567-e89b-42d3-a456-426614174000'}}}}}
 for response in responses.values():
  response.setdefault('headers',{})['X-Request-Id']={'schema':{'type':'string','format':'uuid'},'description':'要求と同じUUID。'}
 details=f"権限: {o['access']}。保存先: {o['write']}。{o['rule']}"
 entry={'operationId':operation_id,'summary':o['title'],'tags':[GROUPS[o['group']][1]],'description':details,'parameters':params,'responses':responses,'x-open-questions':o['blocked'],'x-common-open-questions':['Q01']+(['Q02'] if o['method']=='POST' else []),'x-api-id':o['id']}
 if o['sort']: entry['x-sort']=o['sort']
 if o['body']:
  entry['requestBody']={'required':True,'content':{o['ctype']:{'schema':o['body'],'example':sample(o['body'])}}}
 O['paths'].setdefault(o['path'],{})[o['method'].lower()]=entry
(ROOT/'openapi.json').write_text(json.dumps(O,ensure_ascii=False,indent=2)+'\n')
def type_text(s):
 if '$ref' in s:
  n=s['$ref'].split('/')[-1]; return f'[{n}](../schemas/models.md#{n.lower()})'
 if 'const' in s: return json.dumps(s['const'],ensure_ascii=False)
 if 'enum' in s: return ' / '.join(map(str,s['enum']))
 if 'anyOf' in s or 'oneOf' in s: return ' または '.join(type_text(x) for x in s.get('anyOf',s.get('oneOf')))
 typ=s.get('type','未指定')
 if typ=='array': return '配列<'+ ('座標2値' if 'prefixItems' in s else type_text(s['items']))+'>'
 return str(typ)+(' ('+s['format']+')' if 'format' in s else '')
def constraints(s):
 return '、'.join(f'{k}={v}' for k,v in s.items() if k in ['minLength','maxLength','minimum','maximum','exclusiveMinimum','exclusiveMaximum','minItems','maxItems','uniqueItems','pattern','default','minProperties']) or '—'
def schema_fields(schema):
 if '$ref' in schema: schema=S[schema['$ref'].split('/')[-1]]
 if 'oneOf' in schema:
  return '\n'.join(f'分岐 {i+1}\n\n'+schema_fields(x) for i,x in enumerate(schema['oneOf']))
 if schema.get('type')!='object': return type_text(schema)+'。'+constraints(schema)+'\n'
 rows=['| 項目 | 型 | 必須 | 制約 | 意味 |','|---|---|---|---|---|']
 for k,v in schema.get('properties',{}).items(): rows.append(f"| `{k}` | {type_text(v)} | {'必須' if k in schema.get('required',[]) else '省略可'} | {constraints(v)} | {v.get('description','—').replace('|','／')} |")
 for k,v in schema.get('properties',{}).items():
  child=v
  if 'anyOf' in child: child=next((x for x in child['anyOf'] if x.get('type')!='null'),child)
  if child.get('type')=='array': child=child.get('items',{})
  if isinstance(child,dict) and (child.get('type')=='object' or 'oneOf' in child):
   rows += ['\n`'+k+'` の内部：\n',schema_fields(child)]
 return '\n'.join(rows)+'\n'
models=['# 入出力の型\n','生成元は [build_contracts.py](../tools/build_contracts.py)。機能別文書と同じ定義から出力する。\n','`required`とnullの可否は別。必須かつnull可の項目はキーを送る。記載のないオブジェクト項目は拒否する。\n','本文上限などDB文書にない制限は今回のAPI設計案。詳細は[データ形式](../conventions/01_http.md)を参照。\n']
for n,s in S.items():
 models += [f'## {n}\n',s.get('description','')+'\n', ('[共通型の照合元]('+s['x-source']+')\n' if 'x-source' in s else ''),schema_fields(s)]
 if s.get('type')=='object' and 'properties' not in s: models += ['各プラグインのSchemaを必ず追加適用する。自由なJSONを無検査で保存しない。\n']
(ROOT/'schemas/models.md').write_text('\n'.join(models))
for group,(filename,title) in GROUPS.items():
 selected=[o for o in OPS if o['group']==group]
 lines=[f'# {title}\n','本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。\n','[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。\n','## 操作一覧\n','| ID | Method | パス | 操作 | 固有の未確定依存 |','|---|---|---|---|---|']
 for o in selected: lines.append(f"| [{o['id']}](#operation-{o['id']}) | {o['method']} | `{o['path']}` | {o['title']} | {', '.join(o['blocked']) or 'なし'} |")
 for o in selected:
  entry=O['paths'][o['path']][o['method'].lower()]
  lines += [f"\n<a id=\"operation-{o['id']}\"></a>\n",f"## {o['id']} {o['title']}\n",f"`{o['method']} /api/v1{o['path']}`\n",f"権限：{o['access']}。保存先・更新範囲：{o['write']}。\n",o['rule']+'\n']
  if o['sort']: lines += [f"並び順：`{o['sort']}`。同値でもIDで順序を確定する。\n"]
  if o['blocked']: lines += [f"未確定依存：{', '.join(o['blocked'])}。この部分は型だけで実装完了とは判断できない。\n"]
  lines+=['### パラメータ\n']
  if entry['parameters']:
   lines+=['| 場所 | 名前 | 型 | 必須 | 制約・説明 |','|---|---|---|---|---|']
   for p in entry['parameters']: lines.append(f"| {p['in']} | `{p['name']}` | {type_text(p['schema'])} | {'必須' if p['required'] else '省略可'} | {constraints(p['schema'])} {p.get('description',p['schema'].get('description',''))} |")
  else: lines+=['なし。']
  lines+=['\n### リクエスト本文\n']
  lines+=([schema_fields(o['body'])] if o['body'] else ['なし。GET/DELETEに本文を送らない。\n'])
  if o['body'] and o['ctype']!='multipart/form-data': lines+=['```json',json.dumps(sample(o['body']),ensure_ascii=False,indent=2),'```\n']
  if o['ctype']=='multipart/form-data': lines+=['multipartのfileパートへ実体を渡す。id/positionはフォーム文字列をSchemaの型へ変換して検査する。\n']
  lines+=['### 成功応答\n',f"HTTP {o['code']}。"+('既存場所を再利用した場合は200。' if o['path']=='/places' and o['method']=='POST' else '')+'\n']
  if o['out']:
   if o['ctype']=='binary': lines+=['単一Rangeの成功は206、Content-RangeとContent-Lengthを返す。\n']
   lines+=[schema_fields(o['payload'])]
   if o['ctype']!='binary': lines+=['```json',json.dumps(sample(o['payload']),ensure_ascii=False,indent=2),'```\n']
   else: lines+=['本文は実体バイト列、Content-Typeは検証済みMIME。\n']
  else: lines+=['本文なし。\n']
  lines+=['### 失敗応答\n','[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。\n','| HTTP | code | 条件 |','|---|---|---|']
  for code,c in o['err'].items(): lines.append(f'| {code} | `{c}` | {ERROR_TEXT[code]} |')
  lines+=['\nPOSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。\n' if o['method']=='POST' else '\n']
 (ROOT/'endpoints'/f'{filename}.md').write_text('\n'.join(lines))
import hashlib
sources=list((ROOT.parent/'01_DB').glob('*.json'))+list((ROOT.parent/'02_common').rglob('*.json'))+list((ROOT.parent/'02_common').rglob('*.md'))+list((ROOT.parent/'02_common').rglob('*.sql'))
manifest={str(p.relative_to(ROOT.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(sources)}
(ROOT/'schemas/source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'{len(OPS)} operations, {len(S)} schemas, 7 detailed endpoint documents generated')
