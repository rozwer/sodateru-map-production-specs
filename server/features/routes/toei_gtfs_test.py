import unittest
from datetime import date
from toei_gtfs import seconds,active_services,fare_for,match_shape,Fault

class TimetableRules(unittest.TestCase):
 def test_service_exception_and_24_plus_time(self):
  base={'service_id':'weekday','start_date':'20260915','end_date':'20260930',**{k:'1' for k in ['monday','tuesday','wednesday','thursday','friday']},'saturday':'0','sunday':'0'}
  changes=[{'service_id':'weekday','date':'20260916','exception_type':'2'},{'service_id':'special','date':'20260916','exception_type':'1'}]
  self.assertEqual(active_services([base],changes,date(2026,9,16)),{'special'})
  self.assertEqual(seconds('25:05:03'),90303)
  with self.assertRaises(Fault):seconds('25:61:00')
 def test_zone_fares_require_matching_origin_destination_and_all_contains(self):
  attr={'f':{'price':'210','ic_price':'-1','currency_type':'JPY','transfers':'0','transfer_duration':'0'}}
  rules=[{'fare_id':'f','route_id':'r','origin_id':'a','destination_id':'b','contains_id':z} for z in ['x','y']]
  self.assertEqual(fare_for('r','a','b',{'x','y'},rules,attr)['cash'],210)
  for route,origin,zones in [('other','a',{'x','y'}),('r','other',{'x','y'}),('r','a',{'x'})]:
   with self.assertRaises(Fault):fare_for(route,origin,'b',zones,rules,attr)
 def test_shape_projects_between_vertices_in_order_and_rejects_off_shape(self):
  shape=[[139,35],[139.002,35],[139.004,35]]
  positions=match_shape(shape,[[139.001,35],[139.003,35]])
  self.assertAlmostEqual(positions[0],.5);self.assertAlmostEqual(positions[1],1.5)
  with self.assertRaises(Fault):match_shape(shape,[[140,36]])

if __name__=='__main__':unittest.main()
