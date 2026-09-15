"""Imported by build_contracts.py: bind HTTP contracts to current shared schemas."""
import json, copy

def align(env):
 S=env['S']; OPS=env['OPS']; ROOT=env['ROOT']; ref=env['ref']; obj=env['obj']; arr=env['arr']; null=env['null']; en=env['en']; add=env['add']; op=env['op']; query=env['query']; ID=env['ID']; TS=env['TS']; VER=env['VER']; TEXT=env['TEXT']; page=env['page']
 prefixes={'01_ai':'CommonAI','02_places-routes':'CommonMap','03_information':'CommonInfo'}
 imported={}
 for directory,prefix in prefixes.items():
  raw=json.loads((ROOT.parent/'02_common'/directory/'schemas.json').read_text())
  def transform(v):
   if isinstance(v,list): return [transform(x) for x in v]
   if not isinstance(v,dict): return v
   result={}
   for k,val in v.items():
    if k=='$ref' and '#/definitions/' in val:
     target_prefix=prefix
     if val.startswith('https:'):
      namespace=val.split('#')[0].rsplit('/',1)[-1]
      target_prefix={'ai':'CommonAI','places':'CommonMap','information':'CommonInfo'}[namespace]
     result[k]='#/components/schemas/'+target_prefix+val.split('/')[-1]
    elif k=='items' and isinstance(val,list):
     result['prefixItems']=[transform(x) for x in val]; result['items']=False
    elif k not in ['$id','$schema','additionalItems']: result[k]=transform(val)
   return result
  for name,value in raw['definitions'].items():
   value=transform(value); value['x-source']=f'../../02_common/{directory}/schemas.json#/definitions/{name}'
   add(prefix+name,value)
  imported[directory]=raw
 # Copies preserve names at the HTTP boundary while retaining exact shared constraints.
 def schema(n): return copy.deepcopy(S[n])
 def rename_props(s,mapping):
  s=copy.deepcopy(s)
  if 'properties' in s:
   s['properties']={mapping.get(k,k):v for k,v in s['properties'].items()}
   s['required']=[mapping.get(k,k) for k in s.get('required',[])]
  return s
 S['Id']['pattern']=r'\S'
 S['Place']=schema('CommonMapPlace')
 S['Candidate']=rename_props(schema('CommonMapPlaceCandidate'),{'coordinates':'position'})
 S['Candidate']['properties']['position']=env['LOC']
 S['CandidateResult']['properties']['items']=arr(ref('Candidate'),0,10)
 # AI accepts the same business input as the shared service; the HTTP names are explicit aliases.
 use_to_task={'extract':'extract','diary':'diary','consult':'consult','comparison':'compare','analysis':'analysis','theme-name':'theme','map-style':'mapstyle','discovery':'discover'}
 S['MessageSend']={'oneOf':[obj({'userMessageId':ID,'assistantMessageId':ID,'body':env['st'](1,20000),'use':{'const':use},'context':ref('CommonAI'+task+'Input'),'expectedRefs':arr(ref('CommonAISourceRef'),0,1000)}) for use,task in use_to_task.items()]}
 S['AIOutput']={'oneOf':[obj({'use':{'const':use},'value':ref('CommonAI'+task+'Result')}) for use,task in use_to_task.items()]}
 S['Message']['properties']['body']=env['st'](0,20000)
 # Match record write limits to the shared read projection; saving AI diary output must round-trip.
 for name in ['Record','RecordCreate','RecordPatch','RecordView']:
  for key in ['body','purposes','impression','topicKey']:
   S[name]['properties'][key]=copy.deepcopy(S['CommonInfoRecordView']['properties'][key])
 env['B']['Record']['body']=env['st'](0,20000)
 # Media lists in the shared RecordView can represent at most 100 attachments.
 S['MediaOrderInput']['properties']['items']['maxItems']=100
 S['MediaUpload']['properties']['position']['maximum']=99
 S['MessageResult']=obj({'message':ref('Message'),'run':null(ref('CommonAIRun')),'output':null(ref('AIOutput'))})
 S['RouteSearchInput']=schema('CommonMapRouteRequest')
 S['RouteSearchResult']=rename_props(schema('CommonMapRoutePreview'),{'previewId':'resultId'})
 S['SavedRoute']=schema('CommonMapSavedRoute')
 S['SavedRouteCreate']=obj({'id':ID,'resultId':ID,'title':env['st'](1,100)})
 S['SavedRoutePatch']['properties']['title']=env['st'](1,100)
 S['PlaceDetail']=schema('CommonInfoPlaceDetail')
 S['Media']['properties']['contentUrl']=null(env['st'](1,400))
 S['SourceLookupInput']=schema('CommonInfoSourcesRequest')
 S['SourceLookup']=arr(ref('CommonInfoSourceCheck'),0,1000)
 # Shared query follows the shared service, including overlap, undated rows and OR purpose matching.
 info=S['CommonInfoRecordQuery']['properties']
 def rq():
  result=query('q placeId longitude latitude radiusM from to timeZone cursor limit')
  result += [{'name':name,'in':'query','required':False,'schema':schema_value,**({'style':'form','explode':True} if name in ['personIds','purposes'] else {})} for name,schema_value in info.items() if name in ['audience','personIds','purposes','topicKey','includeUndated']]
  return result
 for o in OPS:
  key=(o['method'],o['path'])
  if key==('GET','/place-candidates'):
   o['query']=query('q longitude latitude',overrides={'category':en('coffee','restaurant','bakery','park'),'limit':{**env['integer'](1,10),'default':10}})
   o['rule']='qまたはcategoryの一方を必須。qはtrim/NFKC/小文字化して保存場所を検索し、0件ならNominatim。categoryではlongitude/latitudeの両方を必須とし緯度±85。categoryは5件固定のためlimit指定不可。候補は15分、本人・dataModeで分離。temporaryは閲覧だけで保存不可。共通の場所検索仕様を適用。'
   o['blocked']=[]
  if key==('POST','/places'):
   o['rule']+=' 候補のretention=storableを必須としtemporaryは409 REQUEST_CONFLICT。creation_receiptsを期限照合より先に確認し、同じ要求は現在の場所を返す。削除済みなら404で復活させない。categoriesもコピーする。'
  if key==('GET','/records'):
   o['query'] += query('timeZone',overrides={'includeUndated':{'type':'boolean','default':False}})
   o['sort']='effectiveStartedAt DESC NULLS LAST, id ASC'
   o['rule']='本人の記録だけ。共通RecordQueryと同じ期間重なり条件を使いfrom/to/timeZoneを一組で指定。日時不明は期間なし、またはincludeUndated=trueなら含む。placeIdは実効場所、themeIdは本人テーマの所属でAND。返却は編集用RecordView。'
  if key==('POST','/records/{recordId}/media'):
   o['rule']+=' 親記録の媒体が既に100件なら422。'
  if key==('GET','/places/{placeId}'):
   o['rule']='共通getPlaceDetailのPlaceDetailをdataへ返す。colocatedは同じ非nullのbuildingKeyで名前・ID順。本人訪問は全ページ取得し、ownRecords/sharedRecords/visitsを領域別状態で返す。主対象なしは404。schemaのerrorは共通Errorとして保持する。'
  if key==('GET','/conversations/{conversationId}/messages'):
   o['out']=ref('CommonAIMessagePage');o['blocked']=[];o['rule']='listMessagesで本人の会話をposition昇順に取得。構造化カードは各assistantのGET /messages/{id}から取得。引用元が読めない発言を本文として返さない。'
  if o['path'].startswith('/messages/') or key==('POST','/conversations/{conversationId}/messages'):
   o['blocked']=[]
  if key==('POST','/conversations/{conversationId}/messages'):
   o['rule']='body→text、use→task、context→input、expectedRefsを共通startRunへ。会話IDはパスから。user/assistant IDは異なる値。同じ会話にpending/runningがあれば409 BUSY。原文・入力・参照・モデル・promptVersionをmessages.request_jsonへ、応答はresult_jsonへ保存。共通AIの用途別検査と同一入力ハッシュを使う。街歩きはこの入口に混在させずmap-dialoguesへ。analysisは計算済みinsightIdを受け取る。'
  if key==('GET','/messages/{messageId}'):
   o['rule']='本人のMessageとRunを読む。userはrun/output=null。assistantはRunを返し、completeならtaskをuseへ変換しresultをvalueへそのまま返す。message.bodyは表示文。sourceRefs・根拠の現在権限を照合する。'
  if key==('POST','/messages/{messageId}/retry'):
   o['rule']='If-Match→expectedVersion、attempt→expectedAttempt。failed/cancelledのみ。同じIDでattemptを1増やす。元のtext/input/model/promptVersionを再利用し、sourceRefsの版が変更済みなら409 SOURCE_CHANGEDで停止。新しい材料では新しい発言IDを使う。保存前にid/attempt/runningを照合。'
  if key==('POST','/messages/{messageId}/cancel'):
   o['rule']='If-Match→expectedVersion、attempt→expectedAttempt。pending/runningのみcancelledへ更新して取消信号を送る。completeは409。cancelledの応答喪失後はGETで確認する。古い試行はid/attempt/runningに一致せず保存しない。'
  if key==('GET','/media/{mediaId}/content'):
   o['rule']='親記録の現在権限を毎要求検査。pendingは409、failed/ファイルなしは503。readyの実体をContent-TypeとContent-Length付きで返す。単一bytes Rangeは206+Content-Range、範囲外と複数Rangeは416。実パスが媒体ルート外なら配信しない。Cache-Control: private, no-store、Content-Disposition: inline。'
   o['err'].update({416:'RANGE_NOT_SATISFIABLE',503:'PROVIDER_UNAVAILABLE'})
  if key==('POST','/route-searches'):
   o['rule']='共通previewRouteへRouteRequestを渡す。2〜10地点、walking/drivingのみ実接続。cycling/transitは501 MODE_UNSUPPORTED。隣接同座標は400。区間数=地点数−1、形状・距離・時間は全区間成功時に返す。返却previewIdをresultIdへ改名しretentionを保持。temporary候補を含む経路は保存不可。'
   o['blocked']=[];o['err'][501]='MODE_UNSUPPORTED'
  if key==('POST','/saved-routes'):
   o['rule']='resultId→previewId。共通saveRouteがcreation_receiptsを先に照合し、未保存なら本人・dataMode・期限・参照版・retention=storableを検査する。private/sharedWith=[]/saved/currentLeg=0で保存。既存の同じ作成は200、違う入力は409。'
  if key==('PATCH','/saved-routes/{routeId}'):
   o['rule']+=' 共通RouteUpdateへ渡す場合はresultId→previewId、If-Match→expectedVersion。title省略時は現行titleを渡す。temporaryは409。区間geometryもDBへ保存する。'
  if key==('GET','/shared-records') or key==('GET','/shared-records/map') or key==('GET','/places/{placeId}/voices'):
   o['query']=rq();o['out']=ref('CommonInfoRecordPage');o['sort']='effectiveAt DESC NULLS LAST, id ASC'
   o['rule']='共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。'
   if key[1]=='/shared-records/map':
    o['query']=[p for p in o['query'] if p['name'] not in ['cursor','limit']];o['out']=ref('CommonInfoRecordMap');o['sort']=None;o['rule']+=' mapRecordsを使い全体最大2,000投稿、超過は413 INPUT_TOO_LARGE。場所なし投稿はtotalCountに含めitemsから除く。cursorで部分結果を全件として返さない。';o['err'][413]='INPUT_TOO_LARGE'
   if key[1].endswith('/voices'):
    o['query']=[p for p in o['query'] if p['name']!='placeId']
    for p in o['query']:
     if p['name']=='topicKey': p['required']=True
    o['rule']+=' searchTopicsのplaceIdをパスで固定しtopicKeyを必須にする。'
  if key==('DELETE','/friendships/{friendshipId}'):
   o['rule']='当事者のみ。関係行を削除しfriends検索から除く。明示したselected共有は保持し、解除にはrecords/saved-routesの共有更新を使う。';o['blocked']=[]
  if key==('POST','/source-refs/resolve'):
   o['path']='/source-checks';o['out']=ref('SourceLookup');o['rule']='共通checkSourcesへrefsを渡し入力順で{ref,state,currentVersion}をdata配列へ返す。state=current/changed/unavailable。unavailableは削除と権限なしを区別せずcurrentVersion=null。本文は返さない。共有recordと同じ要求にある関連visitは版照合だけ許可し、訪問の直接読出し権限を広げない。'
 # Add the shared service operations missing from the initial inventory.
 for method,path,title,out,body,rule in [
  ('POST','/map-dialogues','街歩き相談',ref('CommonAIDialogueResult'),ref('CommonAIDialogueRequest'),'runDialogue。本人・dataModeにつき同時1件。最大180秒、検索2回・経路3回・AI6回。起点固定。履歴は一時保持のみ。'),
  ('POST','/map-dialogues/select','街歩き候補の選択',ref('CommonAIDialogueResult'),ref('CommonAIDialogueSelect'),'selectDialogueCandidate。本人・dataMode・期限・AI設定版・候補IDを照合。候補の位置と保存された起点で徒歩経路を返す。'),
  ('POST','/map-dialogues/cancel','街歩き相談の取消',None,ref('CommonAIDialogueCancel'),'cancelDialogue。active.requestIdが同じ本人の対象と一致すれば取消。取消済み・実行なしも204。新しい要求IDはヘッダーで区別。'),
  ('GET','/map-dialogues/results/{resultId}','街歩き結果の再取得',ref('CommonAIDialogueResult'),None,'getDialogueResult。本人・dataMode・期限を検査。期限15分、本人ごとに直近6件。期限切れ・再起動後は410。')]:
  op(3,method,path,title,out,body,code=204 if out is None else 200,rule=rule,err=env['EXT'])
 # Analysis input must exist before the shared explanation task can refer to it.
 op(4,'POST','/insights','期間集計の作成',ref('Insight'),obj({'id':ID,'from':TS,'to':TS,'timeZone':env['TZ']}),code=201,rule='本人の期間集計を行いkind=analysis、model=nullでaxes・sourceRefs・inputKey・generatorVersionを保存する。既存同一inputKeyなら200で既存の判断を保持。AI説明が必要なら返却insightIdをanalysisの入力へ渡す。軸の判定規則はQ05。',write='insights',blocked=['Q05'])
 # Discovery is now backed by shared DDL; expose save/read/reaction/delete.
 discover=schema('CommonAIdiscoverResult')['properties']
 card=obj({'id':ID,'personId':ID,**discover,'sourceRefs':arr(ref('CommonAISourceRef'),0,1000),'version':VER,'createdAt':TS,'updatedAt':TS})
 add('DiscoveryCard',card)
 reaction=obj({'id':ID,'personId':ID,'cardId':ID,'reaction':en('known','interested','saved','blocked','dismissed'),'createdAt':TS})
 add('DiscoveryReaction',reaction)
 op(4,'POST','/discovery-cards','発見カード保存',ref('DiscoveryCard'),obj({'id':ID,'assistantMessageId':ID,'expectedAttempt':env['integer'](1)}),code=201,rule='本人のcompleteなdiscover実行とattemptを検査しresult_jsonとsourceRefsをコピー。要求本文に説明や出典を受け付けない。生成の根拠を再照合しdiscovery_cardsへ保存、applied_refs_jsonを同一トランザクションで追記。',write='discovery_cards、messages.applied_refs_json')
 op(4,'GET','/discovery-cards','保存した発見一覧',page('DiscoveryCard'),qs=query('cursor limit',overrides={'savedOnly':{'type':'boolean','default':False}}),sort='createdAt DESC, id DESC',rule='本人のカードのみ。savedOnly=trueは各カードの最新のsaved/blocked/dismissedがsavedのもの。createdAt同値では反応ID ASCの最後を採用。known/interestedは保存表示に影響しない。sourceRefsを再照合。')
 op(4,'GET','/discovery-cards/{cardId}','発見カード詳細',ref('DiscoveryCard'),rule='本人のみ。sourceRefsの版・現在権限を照合し変更済みなら409 SOURCE_CHANGED、閲覧不可なら404。',err={409:'SOURCE_CHANGED'})
 op(4,'DELETE','/discovery-cards/{cardId}','発見カード削除',code=204,rule='本人と版を照合しカードと反応を削除。元の生成発言は保持。',write='discovery_cards、discovery_reactions')
 op(4,'POST','/discovery-cards/{cardId}/reactions','発見への反応',ref('DiscoveryReaction'),obj({'id':ID,'reaction':en('known','interested','saved','blocked','dismissed')}),code=201,rule='本人のカードへ固定IDで反応を保存。同じ反応ID・同じ内容は既存反応を返す。違う内容は409。保存一覧への作用は共通の発見保存規約。',write='discovery_reactions')
 op(4,'GET','/discovery-cards/{cardId}/reactions','発見の反応履歴',page('DiscoveryReaction'),qs=query('cursor limit'),sort='createdAt DESC, id DESC',rule='本人のカードの反応を時刻降順、同時刻はID降順で取得。保存表示は最新のsaved/blocked/dismissedだけを判定に使う。')
 op(4,'GET','/discovery-cards/{cardId}/reactions/{reactionId}','発見の反応取得',ref('DiscoveryReaction'),rule='本人・cardId・reactionIdの対応を確認して返す。他人または別カードなら404。')
 # Include all CommonError codes losslessly inside the HTTP error envelope.
 new_codes=['INVALID_INPUT','PERSON_REQUIRED','REQUEST_CONFLICT','BUSY','SOURCE_CHANGED','INPUT_TOO_LARGE','OUTPUT_INVALID','ROUTE_NOT_FOUND','MODE_UNSUPPORTED','PROVIDER_UNAVAILABLE','RANGE_NOT_SATISFIABLE']
 S['Error']['properties']['code']['enum']+=new_codes
 S['Error']['properties']['details']['properties']['retryable']={'type':'boolean'}
 # Every shared-operation error has a specified wire representation.
 for o in OPS:
  if o['group'] in [1,3] or o['path'].startswith(('/route-searches','/saved-routes','/shared-records','/source-checks','/discovery-cards')) or o['path'].endswith('/voices'):
   o['err'].update({400:'INVALID_REQUEST',409:'REQUEST_CONFLICT',413:'INPUT_TOO_LARGE',422:'OUTPUT_INVALID',503:'PROVIDER_UNAVAILABLE',504:'TIMEOUT'})
 # Per-operation annotations identify imported contracts for independent consistency review.
 return prefixes
