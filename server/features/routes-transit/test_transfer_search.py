"""Small explicit synthetic boundaries absent from the acquired live feed."""
import copy
import unittest
from datetime import datetime
from transfer_search import search_transfers, InputFault


def epoch(s): return int(datetime.fromisoformat(s+'+09:00').timestamp()*1000)

def fixture():
    stops={k:{'stop_id':k,'stop_name':'FIXTURE '+k,'stop_lon':str(139+i*.001),'stop_lat':'35','zone_id':k,'location_type':'0','parent_station':''} for i,k in enumerate('ABCDX')}
    def events(trip,ids,times):return [{'trip_id':trip,'stop_sequence':str(i+1),'stop_id':k,'arrival_time':t,'departure_time':t,'pickup_type':'','drop_off_type':'','timepoint':'1'} for i,(k,t) in enumerate(zip(ids,times))]
    data={'feed':{'feed_start_date':'20260915','feed_end_date':'20260917','feed_version':'SYNTHETIC-BOUNDARIES'},'metadata':{},'sha256':'fixture-not-live','agency':[{'agency_id':'a','agency_name':'FIXTURE bus'}],
        'stops':stops,'routes':{'r1':{'route_type':'3','route_short_name':'FIXTURE1','agency_id':'a'},'r2':{'route_type':'3','route_short_name':'FIXTURE2','agency_id':'a'}},
        'trips':{'T1':{'service_id':'daily','route_id':'r1','shape_id':'s1'},'T2':{'service_id':'daily','route_id':'r2','shape_id':'s2'}},
        'schedules':{'T1':events('T1','ABC',['08:00:00','08:05:00','08:10:00']),'T2':events('T2','CD',['08:13:00','08:30:00'])},
        'calendars':[{'service_id':'daily','start_date':'20260915','end_date':'20260917',**{day:'1' for day in ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']}}],'exceptions':[],
        'shapes':{},'fares':{'f':{'price':'100','currency_type':'JPY','ic_price':'90','transfers':'0','transfer_duration':'0'}},'rules':[{'fare_id':'f','route_id':'','origin_id':'','destination_id':'','contains_id':''}]}
    for shape,ids in [('s1','ABC'),('s2','CD')]:data['shapes'][shape]=[{'shape_pt_sequence':str(i),'shape_pt_lon':stops[k]['stop_lon'],'shape_pt_lat':stops[k]['stop_lat']} for i,k in enumerate(ids)]
    return data


class TransferBoundaries(unittest.TestCase):
    def query(self, data=None, **extra):
        return search_transfers(data or fixture(),{'fromStopIds':['A'],'toStopIds':['D'],'earliestDepartureAt':epoch('2026-09-15T07:59:00'),**extra})
    def test_transfer_sequence_fare_and_boarding(self):
        d=fixture();r=self.query(d)
        self.assertEqual(r['status'],'ok');p=r['journeys'][0]
        self.assertEqual([l['tripId'] for l in p['legs']],['T1','T2'])
        self.assertEqual(p['transferCount'],1);self.assertEqual(p['fare']['amount'],200)
        self.assertEqual(p['durationSec'],31*60)
        self.assertEqual(self.query(d,maxTransfers=0)['status'],'no_trip')
        d['schedules']['T1'][0]['pickup_type']='1'
        self.assertEqual(self.query(d)['status'],'no_trip')
        d=fixture();d['schedules']['T1'][-1]['drop_off_type']='1'
        self.assertEqual(self.query(d)['status'],'no_trip')
        # Intermediate pickup=1 does not require passengers already aboard to leave.
        d=fixture();d['schedules']['T1'][1]['pickup_type']='1'
        self.assertEqual(self.query(d)['status'],'ok')
    def test_calendar_over24_and_end_of_feed(self):
        d=fixture();d['exceptions']=[{'service_id':'daily','date':'20260915','exception_type':'2'}]
        self.assertEqual(self.query(d)['status'],'no_service')
        d['exceptions']=[{'service_id':'special','date':'20260915','exception_type':'1'}]
        for t in d['trips'].values():t['service_id']='special'
        self.assertEqual(self.query(d)['status'],'ok')
        d=fixture()
        for events in d['schedules'].values():
            for e in events:
                h,m,s=e['arrival_time'].split(':');e['arrival_time']=e['departure_time']=str(int(h)+16)+':'+m+':'+s
        r=self.query(d,earliestDepartureAt=epoch('2026-09-16T00:00:00'))
        self.assertEqual(r['status'],'ok');self.assertEqual(r['journeys'][0]['legs'][0]['serviceDate'],'20260915')
        r=self.query(d,earliestDepartureAt=epoch('2026-09-18T00:00:00'))
        self.assertEqual(r['journeys'][0]['legs'][0]['serviceDate'],'20260917')
        self.assertEqual(self.query(d,earliestDepartureAt=epoch('2026-09-20T00:00:00'))['status'],'out_of_period')
        self.assertEqual(self.query(earliestDepartureAt=epoch('2026-09-15T23:59:00'),maxJourneySec=30)['status'],'no_trip')
    def test_trusted_walk_and_time_budget(self):
        d=fixture();d['schedules']['T2'][0]['stop_id']='X';d['shapes']['s2'][0]['shape_pt_lon']=d['stops']['X']['stop_lon']
        self.assertEqual(self.query(d)['status'],'no_trip')
        walk={'fromStopId':'C','toStopId':'X','durationSec':30,'geometry':{'type':'LineString','coordinates':[[139.002,35],[139.004,35]]},'sourceUrl':'https://example.test/explicit-road-fixture','fetchedAt':1}
        r=self.query(d,transferWalks=[walk]);self.assertEqual(r['status'],'ok');self.assertEqual(r['journeys'][0]['legs'][1]['kind'],'walking')
        self.assertEqual(self.query(d,transferWalks=[{**walk,'durationSec':90}])['status'],'no_trip')
        self.assertEqual(self.query(d,transferWalks=[walk],latestArrivalAt=epoch('2026-09-15T08:29:00'))['status'],'no_trip')
        with self.assertRaises(InputFault):self.query(d,transferWalks=[{**walk,'geometry':{'type':'LineString','coordinates':[[0,0],[1,1]]}}])
    def test_missing_fare_shape_and_transfer_discount_not_success(self):
        d=fixture();d['fares']={}
        r=self.query(d);self.assertEqual(r['status'],'partial');self.assertIsNone(r['journeys'][0]['fare']['amount'])
        d=fixture();d['fares']['f']['transfers']='1'
        self.assertEqual(self.query(d)['status'],'partial')
        d=fixture();d['shapes']['s2']=[]
        r=self.query(d);self.assertEqual(r['status'],'partial');self.assertIsNone(r['journeys'][0]['legs'][1]['geometry'])
        r=self.query(payment='ic');self.assertEqual(r['journeys'][0]['fare']['amount'],180)
        with self.assertRaises(InputFault):self.query(minTransferSec=-1)

if __name__=='__main__':unittest.main()
