import './fixture';
import { useState } from 'react';
import { ActivityStatsView, SourcesView, type StatisticsView, type StatsPeriod } from '../../../../src/features/settings/statistics-view';
import type { ScreenProps } from '../../../../src/app/contracts';
import { createRoot } from 'react-dom/client';
import { App } from '../../../../src/app/App';
import { screens } from '../../../../src/features/settings/screens';
import { api } from '../../../../src/app/api';
const data: StatisticsView = {
 fromLabel:'9月9日',toLabel:'9月15日',updatedLabel:'9月15日 22:10',confirmedPlaces:4,newPlaces:2,distanceLabel:null,
 coverageLabel:'訪問4件・記録3件の表示例',missingLabel:'GPS距離は未取得です。未取得値を0として数えません。',
 activities:[{id:'cafe',label:'カフェでひと息',count:2,records:[{id:'preview-cafe',label:'コーヒーと本のあるカフェ'}]},{id:'books',label:'本を探す',count:1,records:[{id:'preview-books',label:'やまびこ書店'}]}],
 sources:[{id:'visits',label:'訪問場所',description:'本人が確認した記録',status:'地図上で記録した訪問場所から集計（表示例）'},{id:'gps',label:'移動距離',description:'GPSの観測線',status:'未取得（歩数への換算なし）'}]
};
function Stats({navigate,route}:ScreenProps) { const [period,setPeriod]=useState<StatsPeriod>('week'); return <div className="settings-screen"><ActivityStatsView data={period === 'week' ? data : {...data,fromLabel:'9月15日',toLabel:'9月15日',confirmedPlaces:0,newPlaces:0,activities:[],coverageLabel:'記録0件の表示例'}} period={period} onPeriod={setPeriod} onSources={()=>navigate('data-sources',route.params)} onHistory={()=>navigate('settings')} onRecord={()=>navigate('settings')}/></div>; }
function Sources({navigate}:ScreenProps) { return <div className="settings-screen"><SourcesView data={data} onHistory={()=>navigate('settings')}/></div>; }
const previewScreens = [...screens,{id:'activity-stats',title:'活動の統計',component:Stats,layout:{presentation:'fullscreen',header:'back',bottomNav:false,background:'soft'} as const},{id:'data-sources',title:'データの取得元',component:Sources,layout:{presentation:'fullscreen',header:'back',bottomNav:false,background:'soft'} as const}];
api.setDataMode('demo');
createRoot(document.getElementById('root')!).render(<><aside style={{position:'fixed',top:0,left:0,zIndex:9999,fontSize:12,padding:'2px 8px',background:'#fff1cf',color:'#5c3d00'}}>UI検査用のテスト応答・実API未接続</aside><App screens={previewScreens} scopeKey="ui-settings-visual-fixture" dataMode="demo" profile={null}/></>);
