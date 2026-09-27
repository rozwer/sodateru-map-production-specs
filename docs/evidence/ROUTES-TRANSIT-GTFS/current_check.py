"""Current feed: unchanged direct output and real transfer runner, no private loader."""
import json, subprocess, sys, types
from pathlib import Path
from datetime import datetime
root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
from server.features.routes.toei_gtfs import run, ZONE
feed='/private/tmp/sodateru-c-toei-gtfs.zip'
metadata='/private/tmp/sodateru-c-toei-gtfs-metadata.json'
old=types.ModuleType('original_toei')
exec(subprocess.check_output(['git','show','b16995b:server/features/routes/toei_gtfs.py'],text=True),old.__dict__)
epoch=int(datetime(2026,9,27,8,tzinfo=ZONE).timestamp()*1000)
request={'stopIds':['0966-03','0946-02','1249-01'],'earliestDepartureAt':epoch}
before=old.run(feed,metadata,request)
after=run(feed,metadata,request)
for value in (before,after):
 for plan in value['plans']:plan['source'].pop('loadedAt',None)
assert before==after
request={'fromStopIds':['0966-02'],'toStopIds':['1025-09'],'earliestDepartureAt':epoch,'maxTransfers':1,'maxJourneySec':10800}
p=subprocess.run([sys.executable,'server/features/routes-transit/runner.py',feed,metadata],input=json.dumps(request),text=True,capture_output=True,check=True)
result=json.loads(p.stdout)
assert result['status']=='ok' and result['journeys']
for journey in result['journeys']:
 assert journey['transferCount']==1 and journey['fare']['amount']==420
 assert all(l['geometry'] and l['fare']['rules'] for l in journey['legs'])
 assert journey['legs'][0]['toStop']['stopId']==journey['legs'][1]['fromStop']['stopId']
 assert journey['legs'][0]['arrivalAt']+120000<=journey['legs'][1]['departureAt']
evidence={'status':'passed','checkedAt':datetime.now(ZONE).isoformat(),'baseline':'b16995b','checks':['direct run output unchanged excluding loadedAt','public runner subprocess imports repository shared loader','real one-transfer journey: matching platform, minimum buffer, shape, fare rules, 420 JPY'], 'metadata':json.load(open(metadata)),'directPlans':len(after['plans']),'request':request,'result':result}
Path(__file__).with_name('current-check.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'passed','directPlans':len(after['plans']),'transferJourneys':len(result['journeys']),'version':result['source']['version']}))
