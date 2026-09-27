"""Dedicated demo-only runtime acceptance; never target shared/production DBs."""
import urllib.request, urllib.error, http.cookiejar, json, uuid, sys
from pathlib import Path
origin = 'http://127.0.0.1:3222/api/v1'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
log=[]
def req(path, method='GET', body=None, version=None, expect=200):
    headers={'Content-Type':'application/json','X-Data-Mode':'demo','X-Request-Id':str(uuid.uuid4()),'Idempotency-Key':str(uuid.uuid4())}
    if version: headers['If-Match']=json.dumps(str(version))
    try:
        r=opener.open(urllib.request.Request(origin+path,headers=headers,method=method,data=json.dumps(body).encode() if body else None)); status=r.status; value=json.load(r)
    except urllib.error.HTTPError as e: status=e.code; value=json.load(e)
    assert status==expect,(path,status,value)
    if path!='/session': log.append(dict(method=method,path=path,body=body,status=status,response=value))
    return value
req('/session','POST',{'profileKey':'self'},expect=201)
place='b5628596-8ef2-4506-ad73-1b8ecac3510c'
record='8a74f6ec-9080-4366-b614-910b1fe63732'
visit='08db0e48-a3e6-4c59-8fd9-1fa53d867d0b'
mode=sys.argv[1]
statefile=Path('.local/growth-acceptance.json')
if mode=='five':
    ids=[]
    for i in range(4):
        id=str(uuid.uuid4()); ids.append(id)
        req('/visits','POST',dict(id=id,placeId=place,startedAt=None,endedAt=None,timePrecision='unknown',origin='manual'),expect=201)
        req('/visits/'+id,'PATCH',{'status':'confirmed'},1)
    statefile.write_text(json.dumps(ids))
    growth=req('/map/growth');assert growth['items'][0]['confirmedVisitCount']==5
elif mode=='two':
    for id in json.loads(statefile.read_text())[:3]:req('/visits/'+id,'PATCH',{'status':'candidate'},2)
    assert req('/map/growth')['items'][0]['confirmedVisitCount']==2
elif mode=='zero':
    id=json.loads(statefile.read_text())[-1];req('/visits/'+id,'PATCH',{'status':'candidate'},2)
    req('/visits/'+visit,'PATCH',{'status':'candidate'},2)
    assert req('/map/growth')['items']==[]
    assert req('/records/'+record)['data']['record']['body']=='建物成長受入の合成記録。用途を訂正しても本文は保持されます。'
elif mode=='conflict':
    req('/visits/'+visit,'PATCH',{'status':'confirmed'},2,expect=412)
    assert req('/map/growth')['items']==[]
else:raise ValueError(mode)
Path('docs/evidence/BUILDING-GROWTH/http-'+mode+'-2026-09-27.json').write_text(json.dumps(log,ensure_ascii=False,indent=2)+'\n')
print(mode,'PASS',len(log),'HTTP operations')
