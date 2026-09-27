"""Use the sole shared GTFS loader and the published transfer search."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root));sys.path.insert(0,str(root/'server/features/routes-transit'))
from server.features.routes.toei_gtfs import load_feed,Fault
from transfer_search import search_transfers
try:
 request=json.load(sys.stdin);data=load_feed(sys.argv[1],sys.argv[2])
 choices=[]
 for point in request.pop('points'):
  choices.append([s['stop_id'] for s in data['stops'].values() if s.get('location_type','') in ('','0') and all(round(float(s[k]),6)==round(v,6) for k,v in zip(('stop_lon','stop_lat'),point))])
 if len(choices)!=2 or any(not c for c in choices):raise Fault('MODE_UNSUPPORTED','乗り場までの道路徒歩は未接続です。実停留所2点を指定してください')
 print(json.dumps(search_transfers(data,{**request,'fromStopIds':choices[0],'toStopIds':choices[1]}),ensure_ascii=False))
except Fault as error:
 print(json.dumps({'error':{'code':error.code,'message':error.message}},ensure_ascii=False));sys.exit(2)
