"""Bounded schedule connection scan over ROUTES' loaded Toei GTFS.
ROUTES owns feed loading, date/time interpretation, shape matching and fare rules.
This module adds transfers and trusted road-walk edges; never downloads a feed.
"""
import math
from datetime import datetime, timedelta
from collections import defaultdict
from server.features.routes.toei_gtfs import (Fault, ZONE, SOURCE, seconds, active_services, metres, match_shape, interpolate, fare_for)


class InputFault(Fault):
    def __init__(self, message):
        super().__init__('VALIDATION_FAILED', message)


def point(stop):
    return [float(stop['stop_lon']), float(stop['stop_lat'])]


def stop_dto(stop):
    return {'stopId':stop['stop_id'],'name':stop['stop_name'],'coordinates':point(stop),'parentId':stop.get('parent_station') or None}


def validate_walks(walks, stops):
    if not isinstance(walks,list) or len(walks)>1000:
        raise InputFault('乗継徒歩は1000本以内')
    by_stop=defaultdict(list)
    for w in walks:
        if not isinstance(w,dict) or w.get('fromStopId') not in stops or w.get('toStopId') not in stops:
            raise InputFault('乗継徒歩の停留所IDが不正')
        geometry=w.get('geometry',{}); coords=geometry.get('coordinates',[])
        duration=w.get('durationSec')
        if type(duration) not in (int,float) or not math.isfinite(duration) or not 0<duration<=7200 or not str(w.get('sourceUrl','')).startswith('https://') or type(w.get('fetchedAt')) not in (int,float) or not math.isfinite(w['fetchedAt']):
            raise InputFault('実道路の徒歩時刻・出典が不正')
        if geometry.get('type')!='LineString' or len(coords)<2 or any(not isinstance(p,list) or len(p)!=2 or any(type(v) not in (int,float) or not math.isfinite(v) for v in p) or abs(p[0])>180 or abs(p[1])>90 for p in coords):
            raise InputFault('実道路の徒歩形状が不正')
        if metres(point(stops[w['fromStopId']]),coords[0])>60 or metres(point(stops[w['toStopId']]),coords[-1])>60:
            raise InputFault('徒歩形状と乗り場が一致しません')
        by_stop[w['fromStopId']].append(w)
    return by_stop


def search_transfers(loaded, request):
    """Return schedule candidates; from/to are platform IDs, not arbitrary road points.
    Max 3 boardings (2 transfers). Access/egress road timing is composed by ROUTES.
    Missing fares/shapes produce partial, never a fabricated successful route.
    """
    if not isinstance(request,dict) or set(request)-{'fromStopIds','toStopIds','earliestDepartureAt','latestArrivalAt','maxTransfers','maxJourneySec','minTransferSec','payment','transferWalks'}:
        raise Fault('MODE_UNSUPPORTED','未対応の条件を省略して成功にはしません')
    stops=loaded['stops']; feed=loaded['feed']
    earliest=request.get('earliestDepartureAt'); latest=request.get('latestArrivalAt')
    if type(earliest)!=int or earliest<0:
        raise InputFault('出発可能時刻が不正')
    if latest is not None and (type(latest)!=int or latest<=earliest):
        raise InputFault('到着期限が不正')
    try: date=datetime.fromtimestamp(earliest/1000,ZONE).date()
    except (ValueError,OverflowError,OSError): raise InputFault('出発可能時刻が範囲外')
    max_transfers=request.get('maxTransfers',2); horizon=request.get('maxJourneySec',21600); buffer=request.get('minTransferSec',120)
    if type(max_transfers)!=int or not 0<=max_transfers<=2 or type(horizon)!=int or not 0<horizon<=86400 or type(buffer)!=int or not 0<=buffer<=3600:
        raise InputFault('乗継回数・検索時間・乗継余裕が不正')
    payment=request.get('payment','cash')
    if payment not in ('cash','ic'): raise InputFault('現金またはICを指定')
    starts=request.get('fromStopIds'); destinations=request.get('toStopIds')
    for ids in [starts,destinations]:
        if not isinstance(ids,list) or not 1<=len(ids)<=30 or any(not isinstance(i,str) or i not in stops or stops[i].get('location_type','') not in ('','0') for i in ids):
            raise InputFault('乗り場IDを1〜30件指定してください')
    walks=validate_walks(request.get('transferWalks',[]),stops)
    # This Toei dataset has no transfers.txt. Do not silently ignore another feed's rules.
    if loaded.get('transfers'):
        raise Fault('MODE_UNSUPPORTED','feed固有のtransfer規則は未対応です')
    source=source_dto(loaded)
    warnings=['都営バスの時刻表による予定。遅延・実運休は未確認です。','鉄道・他地域・定期券は未評価です。初終端の実道路徒歩はROUTES側で接続してください。']
    scope={'maxTransfers':max_transfers,'maxJourneySec':horizon,'minTransferSec':buffer,'walking':'trusted-road-edges-only','realTime':False}
    def result(status, journeys=[]): return {'status':status,'journeys':journeys,'source':source,'warnings':warnings,'scope':scope}
    end=min(earliest+horizon*1000,latest if latest is not None else earliest+horizon*1000)
    schedules={}; max_time=0
    for trip_id,events in loaded['schedules'].items():
        try:
            ordered=sorted(events,key=lambda e:int(e['stop_sequence']))
            times=[(seconds(e['arrival_time']),seconds(e['departure_time'])) for e in ordered]
            if len({int(e['stop_sequence']) for e in ordered})!=len(ordered) or any(a>b or i and a<times[i-1][1] for i,(a,b) in enumerate(times)):
                continue
            # Unverified on-demand/time windows must not become scheduled service.
            if any(e.get('start_pickup_drop_off_window') or e.get('end_pickup_drop_off_window') for e in ordered): continue
            schedules[trip_id]=(ordered,times)
            max_time=max(max_time,max(t[1] for t in times))
        except (Fault,ValueError,KeyError): continue
    if max_time>72*3600: raise Fault('MODE_UNSUPPORTED','72時間超の運行日は未対応です')
    connections=[]; in_period=False; has_services=False
    for offset in range(-(max_time//86400),2):
        d=date+timedelta(days=offset);key=d.strftime('%Y%m%d')
        midnight=int(datetime.combine(d,datetime.min.time(),ZONE).timestamp()*1000)
        if midnight>end or (d<date and midnight+max_time*1000<earliest): continue
        if not feed['feed_start_date']<=key<=feed['feed_end_date']: continue
        in_period=True
        services=active_services(loaded['calendars'],loaded['exceptions'],d)
        if not services:continue
        has_services=True
        for trip_id,(events,times) in schedules.items():
            trip=loaded['trips'][trip_id]
            if trip['service_id'] not in services or loaded['routes'][trip['route_id']]['route_type']!='3':continue
            for i in range(len(events)-1):
                departure=midnight+times[i][1]*1000; arrival=midnight+times[i+1][0]*1000
                if departure<earliest or arrival>end: continue
                connections.append((departure,trip_id,i,key,midnight,arrival,events[i]['stop_id'],events[i+1]['stop_id'],events[i].get('pickup_type',''),events[i+1].get('drop_off_type','')))
    if not in_period:return result('out_of_period')
    if not has_services:return result('no_service')
    connections.sort(key=lambda c:(c[0],c[1],c[2]))
    previous={i:(earliest,[]) for i in starts}; answers=[]
    for round_no in range(max_transfers+1):
        ready=dict(previous)
        if round_no:
            for ident,(arrival,path) in previous.items():
                for w in walks.get(ident,[]):
                    at=arrival+math.ceil(w['durationSec']*1000)
                    if at<ready.get(w['toStopId'],(math.inf,None))[0]:
                        ready[w['toStopId']]=(at,path+[{'kind':'walking',**w,'departureAt':arrival,'arrivalAt':at}])
        following={}; onboard={}
        for departure,trip_id,i,date_key,midnight,arrival,from_id,to_id,pickup,dropoff in connections:
            key=(date_key,trip_id); aboard=onboard.get(key); label=ready.get(from_id)
            last_ride=next((r for r in reversed(label[1]) if r['kind']=='ride'),None) if label else None
            same_trip=last_ride is not None and last_ride['tripId']==trip_id and last_ride['serviceDate']==date_key
            if aboard is None and label is not None and not same_trip and pickup in ('','0') and label[0]+(buffer*1000 if round_no else 0)<=departure:
                aboard=label[1]+[{'kind':'ride','tripId':trip_id,'serviceDate':date_key,'midnight':midnight,'fromIndex':i,'toIndex':i+1,'departureAt':departure,'arrivalAt':arrival}]
            if aboard is None:continue
            path=aboard[:-1]+[{**aboard[-1],'toIndex':i+1,'arrivalAt':arrival}]
            onboard[key]=path
            if dropoff in ('','0') and arrival<following.get(to_id,(math.inf,None))[0]:following[to_id]=(arrival,path)
        for ident,label in following.items():
            if ident in destinations:answers.append(label)
        previous=following
        if not previous:break
    answers.sort(key=lambda a:(a[0],len(a[1])))
    plans=[];seen=set();shape_cache={}
    for arrival,path in answers:
        key=str(path)
        if key in seen:continue
        seen.add(key)
        legs=[bus_leg(loaded,schedules,ride,payment,source,shape_cache) if ride['kind']=='ride' else ride for ride in path]
        fares=[leg['fare'] for leg in legs if leg['kind']=='bus']
        known=all(f['status']=='known' for f in fares)
        if len(fares)>1 and any(f.get('transfers')!='0' for f in fares):known=False
        total={'status':'known' if known else 'unknown','amount':sum(f['amount'] for f in fares) if known else None,'currency':'JPY' if known else None,'payment':payment,'passEvaluation':'not_applied','fareIds':[f.get('fareId') for f in fares if f.get('fareId')],'warnings':[] if known else ['乗継割引または区間運賃が不明。合計を確定しません。']}
        status='ready' if known and all(l['geometry'] is not None for l in legs) else 'partial'
        departure=legs[0]['departureAt']
        plans.append({'status':status,'legs':legs,'departureAt':departure,'arrivalAt':arrival,'waitDurationSec':(departure-earliest)/1000,'rideDurationSec':sum((l['arrivalAt']-l['departureAt'])/1000 for l in legs if l['kind']=='bus'),'durationSec':(arrival-earliest)/1000,'transferCount':len(fares)-1,'fare':total,'source':source,'warnings':[w for l in legs for w in l.get('warnings',[])]})
        if len(plans)==5:break
    return result('no_trip' if not plans else 'ok' if all(p['status']=='ready' for p in plans) else 'partial',plans)


def source_dto(data):
    f=data['feed'];m=data['metadata']
    return {'url':SOURCE,'sha256':data['sha256'],'version':f['feed_version'],'validFrom':f['feed_start_date'],'validThrough':f['feed_end_date'],'lastModified':m.get('lastModified'),'fetchedAt':m.get('fetchedAt'),'loadedAt':int(datetime.now().timestamp()*1000),'license':'https://creativecommons.org/licenses/by/4.0/','attribution':'東京都交通局・公共交通オープンデータ協議会','modification':'既存ROUTES読込結果から予定便の乗継・区間・運賃を抽出。shape投影照合は既存ROUTES実装。'}


def bus_leg(data,schedules,ride,payment,source,cache):
    trip=data['trips'][ride['tripId']];events,times=schedules[ride['tripId']]
    a,b=ride['fromIndex'],ride['toIndex'];used=events[a:b+1];stops=data['stops'];warnings=[]
    geometry=None;positions=None
    try:
        pattern=(trip['shape_id'],tuple(e['stop_id'] for e in events))
        if pattern not in cache:
            raw=sorted(data['shapes'][trip['shape_id']],key=lambda r:int(r['shape_pt_sequence']))
            shape=[[float(r['shape_pt_lon']),float(r['shape_pt_lat'])] for r in raw]
            if len(shape)<2:raise Fault('GEOMETRY_UNAVAILABLE','shapeが不足')
            cache[pattern]=(shape,match_shape(shape,[point(stops[e['stop_id']]) for e in events]))
        shape,positions=cache[pattern];start,end=positions[a],positions[b]
        if end<=start:raise Fault('GEOMETRY_UNAVAILABLE','shape区間が一致しない')
        geometry={'type':'LineString','coordinates':[interpolate(shape,start)]+shape[math.floor(start)+1:math.ceil(end)]+[interpolate(shape,end)]}
    except (Fault,KeyError,ValueError):warnings.append('便のshapeと停留所順の対応が未確認。直線で代用しません。')
    try:
        fare=fare_for(trip['route_id'],stops[used[0]['stop_id']]['zone_id'],stops[used[-1]['stop_id']]['zone_id'],{stops[e['stop_id']]['zone_id'] for e in used},data['rules'],data['fares'])
        if fare[payment] is None:raise Fault('FARE_UNAVAILABLE','指定支払方法の運賃不明')
        fare={**fare,'status':'known','amount':fare[payment],'payment':payment,'passEvaluation':'not_applied'}
    except Fault as error:
        fare={'status':'unknown','amount':None,'currency':None,'payment':payment,'passEvaluation':'not_applied','reason':error.message}
        warnings.append('適用区間運賃が不明。0円・成功として扱いません。')
    if any(e.get('timepoint')=='0' for e in used):warnings.append('概算の停留所時刻を含みます。')
    route=data['routes'][trip['route_id']]
    agency_id=route.get('agency_id') or data['agency'][0]['agency_id']
    agency=next(x for x in data['agency'] if x['agency_id']==agency_id)
    return {'kind':'bus','tripId':ride['tripId'],'routeId':trip['route_id'],'routeName':route['route_short_name'],'serviceId':trip['service_id'],'serviceDate':ride['serviceDate'],'agencyId':agency_id,'agencyName':agency['agency_name'],'shapeId':trip['shape_id'],'fromStop':stop_dto(stops[used[0]['stop_id']]),'toStop':stop_dto(stops[used[-1]['stop_id']]),'departureAt':ride['departureAt'],'arrivalAt':ride['arrivalAt'],'durationSec':(ride['arrivalAt']-ride['departureAt'])/1000,'geometry':geometry,'distanceM':round(sum(metres(p,q) for p,q in zip(geometry['coordinates'],geometry['coordinates'][1:]))) if geometry else None,'stops':[{**stop_dto(stops[e['stop_id']]),'stopSequence':int(e['stop_sequence']),'shapePosition':positions[i] if positions else None,'arrivalAt':ride['midnight']+times[i][0]*1000,'departureAt':ride['midnight']+times[i][1]*1000,'pickupType':int(e.get('pickup_type') or 0),'dropOffType':int(e.get('drop_off_type') or 0)} for i,e in enumerate(events) if a<=i<=b],'fare':fare,'source':source,'shapeMatching':{'method':'monotonic_segment_projection_inference','maxSnapM':60},'warnings':warnings}
