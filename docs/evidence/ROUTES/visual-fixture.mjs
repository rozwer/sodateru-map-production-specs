/** Offline visual fixture; no provider calls, sessions, DB writes or live preview IDs. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const source = read('./live-comparison.json');
const spec = read('../../01_requirements/04_api/openapi.json');
const request = {waypoints:[
  {kind:'point',coordinates:[139.767125,35.681236],label:'東京駅（表示確認）'},
  {kind:'point',coordinates:[139.769,35.682],label:'経由地（表示確認）'},
  {kind:'point',coordinates:[139.771,35.684],label:'目的地（表示確認）'}
],mode:'driving',title:'モック・東京駅周辺の2候補'};
const waypoints = request.waypoints.map(p=>({coordinates:p.coordinates,name:p.label,placeId:null}));
const previews = source.candidates.map((route,i)=>({...route,resultId:`visual-route-${i+1}`,waypoints,mode:'driving',expiresAt:route.fetchedAt+900000,retention:'storable'}));
const {resultId,expiresAt,retention,...snapshot} = previews[0];
const saved = {...snapshot,id:'visual-saved-route',personId:'visual-person',title:request.title,sourceUrl:'https://www.mapbox.com/about/maps/',status:'saved',currentLeg:0,visibility:'private',sharedWith:[],version:1,createdAt:snapshot.fetchedAt,updatedAt:snapshot.fetchedAt};
const navigating = {...saved,status:'navigating',currentLeg:1,version:2,updatedAt:saved.updatedAt+1000};
const finished = {...navigating,status:'finished',version:3,updatedAt:saved.updatedAt+2000};
const ajv = new Ajv2020({strict:false,allErrors:true});addFormats(ajv);
const checked = [];
function check(name,value){const validate=ajv.compile({$ref:`#/components/schemas/${name}`,components:spec.components});assert.ok(validate(value),`${name}: ${JSON.stringify(validate.errors)}`);checked.push(name);}
check('RouteSearchInput',request);
check('RouteComparisonResult',{items:previews});
for(const preview of previews){check('RouteSearchResult',preview);assert.equal(preview.legs.length,2);assert.equal(preview.durationSec,preview.legs.reduce((sum,l)=>sum+l.durationSec,0));}
for(const value of [saved,navigating,finished])check('SavedRoute',value);
const {resultId:previewId,...rest}=previews[0];const commonPreview={previewId,...rest};check('CommonMapRoutePreview',commonPreview);
const bundle={
  kind:'MOCK: offline visual fixture, not live API/save acceptance',
  source:{commit:'19386893491c5a4a80c1bf6ecba4e47b5a55cd33',file:'docs/evidence/ROUTES/live-comparison.json',checkedAt:source.checkedAt},
  schemaChecked:[...new Set(checked)],
  note:'Geometry/legs/steps/distance/time are recorded provider data. IDs/person/labels/status are visual fixtures. Original timestamps are retained; preview IDs are expired and do not exist in the live server. No photos, stay times or applied extra conditions are supplied.',
  searchRequest:request,
  postRouteSearches:{data:previews[0]},
  postRouteComparisons:{data:{items:previews}},
  commonMapRoutePreview:commonPreview,
  postSavedRoutes:{data:saved},
  getSavedRoutes:{items:[saved],nextCursor:null},
  getSavedRoutesRouteId:{data:saved},
  navigation:{data:navigating},
  finished:{data:finished}
};
process.stderr.write(`PASS: ${previews.length} candidates, 3 ordered points, saved/navigation/finished; ${bundle.schemaChecked.join(', ')}\n`);
process.stdout.write(JSON.stringify(bundle,null,2)+'\n');
