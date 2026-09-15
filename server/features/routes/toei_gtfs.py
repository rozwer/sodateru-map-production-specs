"""Read an existing Toei GTFS ZIP. Direct bus trips only; no network, new DB or transfer claims."""
import csv, io, json, zipfile, hashlib, math, sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collections import defaultdict
SOURCE='https://api-public.odpt.org/api/v4/files/Toei/data/ToeiBus-GTFS.zip'
ZONE=ZoneInfo('Asia/Tokyo')
class Fault(Exception):
    def __init__(self,code,message): self.code,self.message=code,message

def seconds(value):
    try:
        h,m,s=map(int,value.split(':'))
        if h<0 or not 0<=m<60 or not 0<=s<60: raise ValueError()
        return h*3600+m*60+s
    except (ValueError,AttributeError): raise Fault('OUTPUT_INVALID','GTFSの時刻が不正です')

def active_services(calendar,exceptions,date):
    key=date.strftime('%Y%m%d');weekday=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][date.weekday()]
    active={r['service_id'] for r in calendar if r['start_date']<=key<=r['end_date'] and r[weekday]=='1'}
    for r in exceptions:
        if r['date']==key:
            if r['exception_type']=='1': active.add(r['service_id'])
            elif r['exception_type']=='2': active.discard(r['service_id'])
            else: raise Fault('OUTPUT_INVALID','運行日例外が不正です')
    return active

def metres(a,b):
    lon1,lat1,lon2,lat2=map(math.radians,[*a,*b]);v=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371008.8*2*math.asin(min(1,math.sqrt(v)))

def interpolate(shape,position):
    index=min(int(position),len(shape)-2);fraction=position-index
    return [shape[index][k]+(shape[index+1][k]-shape[index][k])*fraction for k in (0,1)]

def match_shape(shape,stops):
    # Project onto existing shape segments, then fit ALL trip stops monotonically.
    # These positions are an explicit inference; raw GTFS has no shape_dist_traveled.
    previous=[];back=[];positions=[]
    for stop in stops:
        row=[];links=[];locations=[];cursor=0;best=float('inf');best_j=-1
        scale=math.cos(math.radians(stop[1]))
        for j,(a,b) in enumerate(zip(shape,shape[1:])):
            dx=(b[0]-a[0])*scale;dy=b[1]-a[1];den=dx*dx+dy*dy
            t=max(0,min(1,((stop[0]-a[0])*scale*dx+(stop[1]-a[1])*dy)/den)) if den else 0
            position=j+t;projected=interpolate(shape,position);distance=metres(projected,stop)
            if previous:
                while cursor<len(previous) and positions[-1][cursor]<=position:
                    if previous[cursor]<best: best,best_j=previous[cursor],cursor
                    cursor+=1
            else: best=0
            row.append(best+distance*distance if distance<=60 else float('inf'));links.append(best_j);locations.append(position)
        previous=row;back.append(links);positions.append(locations)
    end=min(range(len(previous)),key=lambda j:previous[j])
    if not math.isfinite(previous[end]): raise Fault('GEOMETRY_UNAVAILABLE','停留所と同一便shapeを照合できません')
    result=[positions[-1][end]]
    for i in range(len(stops)-1,0,-1): end=back[i][end];result.append(positions[i-1][end])
    return list(reversed(result))

def fare_for(route,origin,destination,zones,rules,attributes):
    groups=defaultdict(list)
    for r in rules:
        if r['route_id'] in ('',route): groups[r['fare_id']].append(r)
    matches=[]
    for fare_id,group in groups.items():
        allowed=[r for r in group if r['origin_id'] in ('',origin) and r['destination_id'] in ('',destination)]
        if not allowed or not {r['contains_id'] for r in allowed if r['contains_id']}.issubset(zones): continue
        a=attributes.get(fare_id)
        if not a or a['currency_type']!='JPY': continue
        cash=float(a['price']);ic=float(a.get('ic_price') or '-1')
        if not math.isfinite(cash) or cash<0 or not cash.is_integer(): continue
        matches.append({'fareId':fare_id,'currency':'JPY','cash':int(cash),'ic':int(ic) if ic>=0 and ic.is_integer() else None,'rules':allowed,'transfers':a['transfers'],'transferDurationSec':int(a.get('transfer_duration') or '0')})
    if not matches or len({(m['cash'],m['ic']) for m in matches})!=1: raise Fault('FARE_UNAVAILABLE','一意の適用運賃を確認できません')
    return matches[0]

def run(feed_path,metadata_path,request):
    with open(feed_path,'rb') as f: digest=hashlib.file_digest(f,'sha256').hexdigest()
    with open(metadata_path) as f: metadata=json.load(f)
    if metadata.get('sha256')!=digest or metadata.get('sourceUrl')!=SOURCE: raise Fault('SOURCE_CHANGED','GTFSと取得metadataが一致しません')
    with zipfile.ZipFile(feed_path) as z:
        def rows(name):
            with z.open(name) as stream:
                yield from csv.DictReader(io.TextIOWrapper(stream,encoding='utf-8-sig'))
        feed=list(rows('feed_info.txt'))[0]
        agency=list(rows('agency.txt'))
        if len(agency)!=1 or agency[0]['agency_timezone']!='Asia/Tokyo': raise Fault('MODE_UNSUPPORTED','提供済み都営feed以外は未接続です')
        stops={r['stop_id']:r for r in rows('stops.txt')}
        def point(s): return [float(s['stop_lon']),float(s['stop_lat'])]
        if request.get('action')=='stops':
            q=request.get('q','');return {'items':[{'id':s['stop_id'],'name':s['stop_name'],'coordinates':point(s),'parentId':s['parent_station'] or None} for s in stops.values() if s['location_type'] in ('','0') and q in s['stop_name']][:50]}
        earliest=request.get('earliestDepartureAt');latest=request.get('latestArrivalAt')
        if type(earliest)!=int or earliest<0 or latest is not None and (type(latest)!=int or latest<=earliest): raise Fault('VALIDATION_FAILED','出発可能時刻・到着期限が不正です')
        payment=request.get('payment','cash')
        if payment not in ('cash','ic'): raise Fault('VALIDATION_FAILED','現金またはICを指定してください')
        date=datetime.fromtimestamp(earliest/1000,ZONE).date();key=date.strftime('%Y%m%d')
        if not feed['feed_start_date']<=key<=feed['feed_end_date']: raise Fault('FEED_EXPIRED','指定日はfeed有効期間外です')
        choices=[]
        if 'stopIds' in request:
            if not isinstance(request['stopIds'],list) or not 2<=len(request['stopIds'])<=10 or any(not isinstance(s,str) for s in request['stopIds']): raise Fault('VALIDATION_FAILED','順序付き停留所を2〜10点指定してください')
            for ident in request['stopIds']:
                s=stops.get(ident)
                if not s: raise Fault('NOT_FOUND','停留所がありません')
                choices.append({ident} if s['location_type'] in ('','0') else {c['stop_id'] for c in stops.values() if c['parent_station']==ident and c['location_type'] in ('','0')})
        else:
            if not 2<=len(request.get('points',[]))<=10: raise Fault('VALIDATION_FAILED','順序付き停留所座標を2〜10点指定してください')
            for p in request['points']:
                if not isinstance(p,list) or len(p)!=2 or any(type(v) not in (int,float) or not math.isfinite(v) for v in p) or abs(p[0])>180 or abs(p[1])>90: raise Fault('VALIDATION_FAILED','停留所座標が不正です')
                choices.append({s['stop_id'] for s in stops.values() if s['location_type'] in ('','0') and all(round(v,6)==round(w,6) for v,w in zip(point(s),p))})
        if any(not c for c in choices): raise Fault('MODE_UNSUPPORTED','乗り場までの道路徒歩接続は未実装です。実停留所を指定してください')
        calendars=list(rows('calendar.txt'));exceptions=list(rows('calendar_dates.txt'))
        # Include previous service day for GTFS 24+ times and next day, with a bounded 24-hour departure horizon.
        service_days=[]
        for offset in (-1,0,1):
            d=date+timedelta(days=offset)
            if feed['feed_start_date']<=d.strftime('%Y%m%d')<=feed['feed_end_date']:
                service_days.append((d,int(datetime.combine(d,datetime.min.time(),ZONE).timestamp()*1000),active_services(calendars,exceptions,d)))
        ids=set().union(*(s for _,_,s in service_days))
        routes={r['route_id']:r for r in rows('routes.txt')}
        trips={t['trip_id']:t for t in rows('trips.txt') if t['service_id'] in ids and routes[t['route_id']]['route_type']=='3'}
        schedules=defaultdict(list)
        for st in rows('stop_times.txt'):
            if st['trip_id'] in trips: schedules[st['trip_id']].append(st)
        fares={r['fare_id']:r for r in rows('fare_attributes.txt')};rules=list(rows('fare_rules.txt'))
        candidates=[]
        for trip_id,events in schedules.items():
            events.sort(key=lambda s:int(s['stop_sequence']))
            if len({e['stop_sequence'] for e in events})!=len(events): continue
            selections=[]
            for first in (i for i,e in enumerate(events) if e['stop_id'] in choices[0]):
                selected=[first];cursor=first+1
                for allowed in choices[1:]:
                    found=next((j for j in range(cursor,len(events)) if events[j]['stop_id'] in allowed),None)
                    if found is None: break
                    selected.append(found);cursor=found+1
                if len(selected)==len(choices): selections.append(selected)
            if not selections: continue
            try:
                times=[(seconds(e['arrival_time']),seconds(e['departure_time'])) for e in events]
                if any(a>b or i and a<times[i-1][1] for i,(a,b) in enumerate(times)): continue
                trip=trips[trip_id]
                for selected in selections:
                    if events[selected[0]]['pickup_type'] not in ('','0') or events[selected[-1]]['drop_off_type'] not in ('','0'): continue
                    if any(events[i]['pickup_type'] not in ('','0') or events[i]['drop_off_type'] not in ('','0') for i in selected[1:-1]): continue
                    for d,midnight,services in service_days:
                        if trip['service_id'] not in services: continue
                        departure=midnight+times[selected[0]][1]*1000;arrival=midnight+times[selected[-1]][0]*1000
                        if departure<earliest or departure>=earliest+86400000 or arrival<=departure or latest is not None and arrival>latest: continue
                        used=events[selected[0]:selected[-1]+1];fare=fare_for(trip['route_id'],stops[used[0]['stop_id']]['zone_id'],stops[used[-1]['stop_id']]['zone_id'],{stops[e['stop_id']]['zone_id'] for e in used},rules,fares)
                        if fare[payment] is None: continue
                        candidates.append((arrival,departure,trip_id,d,midnight,events,selected,times,fare))
            except Fault: continue
        candidates.sort(key=lambda c:(c[0],c[1],c[2]));shapes=defaultdict(list)
        for r in rows('shapes.txt'): shapes[r['shape_id']].append(r)
        plans=[];matched={}
        for arrival,departure,trip_id,d,midnight,events,selected,times,fare in candidates:
            trip=trips[trip_id];shape_rows=sorted(shapes[trip['shape_id']],key=lambda r:int(r['shape_pt_sequence']))
            shape=[[float(r['shape_pt_lon']),float(r['shape_pt_lat'])] for r in shape_rows]
            if len(shape)<2: continue
            pattern=(trip['shape_id'],tuple(e['stop_id'] for e in events))
            try:
                if pattern not in matched: matched[pattern]=match_shape(shape,[point(stops[e['stop_id']]) for e in events])
                indices=matched[pattern];legs=[];geometry=[]
                for i,(a,b) in enumerate(zip(selected,selected[1:])):
                    start,end=indices[a],indices[b]
                    if end<=start: raise Fault('GEOMETRY_UNAVAILABLE','乗り場のshape位置が重複しています')
                    line=[interpolate(shape,start)]+shape[math.floor(start)+1:math.ceil(end)]+[interpolate(shape,end)];geometry.extend(line if i==0 else line[1:])
                    duration=(midnight+times[b][0]*1000-(earliest if i==0 else midnight+times[a][0]*1000))//1000
                    legs.append({'fromIndex':i,'toIndex':i+1,'geometry':{'type':'LineString','coordinates':line},'distanceM':round(sum(metres(p,q) for p,q in zip(line,line[1:]))),'durationSec':duration})
                chosen=[events[i] for i in selected]
                plans.append({'provider':'toei-gtfs','scope':'direct_bus_only','tripId':trip_id,'routeId':trip['route_id'],'routeName':routes[trip['route_id']]['route_short_name'],'serviceId':trip['service_id'],'serviceDate':d.strftime('%Y%m%d'),'shapeId':trip['shape_id'],'stops':[{'stopId':e['stop_id'],'parentId':stops[e['stop_id']]['parent_station'] or None,'name':stops[e['stop_id']]['stop_name'],'coordinates':point(stops[e['stop_id']]),'stopSequence':int(e['stop_sequence']),'shapePosition':indices[i],'arrivalAt':midnight+times[i][0]*1000,'departureAt':midnight+times[i][1]*1000} for e,i in zip(chosen,selected)],'geometry':{'type':'LineString','coordinates':geometry},'legs':legs,'distanceM':sum(l['distanceM'] for l in legs),'durationSec':sum(l['durationSec'] for l in legs),'departureAt':departure,'arrivalAt':arrival,'waitDurationSec':(departure-earliest)//1000,'rideDurationSec':(arrival-departure)//1000,'fare':{**fare,'payment':payment,'amount':fare[payment],'passEvaluation':'not_applied'},'shapeMatching':{'method':'monotonic_segment_projection_inference','maxSnapM':60},'source':{'url':SOURCE,'license':'https://creativecommons.org/licenses/by/4.0/','attribution':'東京都交通局・公共交通オープンデータ協議会','modification':'GTFSから運行日/便/区間/運賃を抽出しshapeと停留所を照合','sha256':digest,'version':feed['feed_version'],'validFrom':feed['feed_start_date'],'validThrough':feed['feed_end_date'],'lastModified':metadata.get('lastModified'),'loadedAt':int(datetime.now().timestamp()*1000)}})
                if len(plans)==2: break
            except Fault: continue
        if not plans: raise Fault('NO_DIRECT_BUS','条件を満たす同一便のバス経路がありません。乗継・鉄道・道路徒歩は未接続です')
        return {'plans':plans}

if __name__=='__main__':
    try: print(json.dumps(run(sys.argv[1],sys.argv[2],json.load(sys.stdin)),ensure_ascii=False))
    except Fault as e: print(json.dumps({'error':{'code':e.code,'message':e.message}},ensure_ascii=False));sys.exit(2)
