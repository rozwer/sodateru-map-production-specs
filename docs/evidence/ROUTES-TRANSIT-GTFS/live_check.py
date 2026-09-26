"""Read the acquired real feed with the single ROUTES loader; verify transfers.
Run from repo root with PYTHONDONTWRITEBYTECODE=1. No new provider download.
"""
import sys,json,time
from pathlib import Path
from datetime import datetime
root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
sys.path.insert(0,str(root/'server/features/routes-transit'))
from server.features.routes.toei_gtfs import load_feed, seconds, active_services, ZONE
from transfer_search import search_transfers

if __name__=='__main__':
    started=time.monotonic()
    loaded=load_feed('/private/tmp/sodateru-c-toei-gtfs.zip','/private/tmp/sodateru-c-toei-gtfs-metadata.json')
    stops=loaded['stops']
    request={'fromStopIds':[i for i,s in stops.items() if s['stop_name']=='東京駅丸の内南口' and s['location_type'] in ('','0')],
        'toStopIds':[i for i,s in stops.items() if s['stop_name']=='豊洲駅前' and s['location_type'] in ('','0')],
        'earliestDepartureAt':int(datetime(2026,9,15,8,0,tzinfo=ZONE).timestamp()*1000),'maxTransfers':2,'maxJourneySec':10800,'payment':'cash'}
    result=search_transfers(loaded,request)
    assert result['journeys'],result
    transfers=[p for p in result['journeys'] if p['transferCount']>=1 and p['status']=='ready']
    assert transfers,result
    plan=transfers[0]
    for i,leg in enumerate(plan['legs']):
        assert leg['kind']=='bus' # fixed evidence uses exact same-stop transfers
        raw=loaded['trips'][leg['tripId']]
        assert raw['route_id']==leg['routeId'] and raw['shape_id']==leg['shapeId'] and raw['service_id']==leg['serviceId']
        d=datetime.strptime(leg['serviceDate'],'%Y%m%d').date()
        assert raw['service_id'] in active_services(loaded['calendars'],loaded['exceptions'],d)
        midnight=int(datetime.combine(d,datetime.min.time(),ZONE).timestamp()*1000)
        events={int(e['stop_sequence']):e for e in loaded['schedules'][leg['tripId']]}
        for s in leg['stops']:
            e=events[s['stopSequence']]
            assert e['stop_id']==s['stopId'] and midnight+seconds(e['arrival_time'])*1000==s['arrivalAt'] and midnight+seconds(e['departure_time'])*1000==s['departureAt']
        assert leg['stops'][0]['pickupType']==0 and leg['stops'][-1]['dropOffType']==0
        if i:
            before=plan['legs'][i-1]
            assert before['toStop']['stopId']==leg['fromStop']['stopId']
            assert before['arrivalAt']+120000<=leg['departureAt']
            assert before['tripId']!=leg['tripId']
        assert leg['geometry']['type']=='LineString' and len(leg['geometry']['coordinates'])>=2
        assert leg['fare']['status']=='known' and leg['fare']['rules']
        for rule in leg['fare']['rules']:
            assert rule['route_id'] in ('',leg['routeId'])
    assert plan['fare']['amount']==sum(l['fare']['amount'] for l in plan['legs'])
    assert plan['durationSec']==(plan['arrivalAt']-request['earliestDepartureAt'])/1000
    # Real exception: the replacement service runs while regular weekday service is removed.
    services=active_services(loaded['calendars'],loaded['exceptions'],datetime(2026,9,15).date())
    assert '29-171' in services and '29-170' not in services
    direct=search_transfers(loaded,{**request,'maxTransfers':0})
    late=search_transfers(loaded,{**request,'earliestDepartureAt':int(datetime(2026,9,15,23,59,tzinfo=ZONE).timestamp()*1000),'maxJourneySec':30})
    assert late['status']=='no_trip'
    summary={'status':'passed','verifiedAt':datetime.now(ZONE).isoformat(),'durationSec':round(time.monotonic()-started,3),
      'checks':['real feed multiple trips / ordered stop times / same-platform transfer buffer','each service day matches calendar and added/removed exception','fare rule route IDs and sum of separate non-transfer fares','provider shape on each ridden trip, no synthetic connector','no late-night trip within bounded window'],
      'directOnlyStatus':direct['status'],'lateNightStatus':late['status'],'request':request,'result':result,
      'limitations':['No real 24+ stop_times in this feed; explicit fixture boundary verifies rollover.','Initial/final walking and normal ROUTES HTTP/save are connected by #25.','No train/other-region/pass/realtime completion claim.']}
    Path(__file__).with_name('live-check.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':summary['status'],'durationSec':summary['durationSec'],'journeys':len(result['journeys']),'selectedTrips':[l['tripId'] for l in plan['legs']],'fare':plan['fare'],'directOnlyStatus':direct['status']},ensure_ascii=False))
