import './fixture';
import { createRoot } from 'react-dom/client';
import { App } from '../../../../src/app/App';
import { screens } from '../../../../src/features/settings/screens';
import { api } from '../../../../src/app/api';
api.setDataMode('demo');
createRoot(document.getElementById('root')!).render(<><aside style={{position:'fixed',top:0,left:0,zIndex:9999,fontSize:12,padding:'2px 8px',background:'#fff1cf',color:'#5c3d00'}}>UI検査用のテスト応答・実API未接続</aside><App screens={screens} scopeKey="ui-settings-visual-fixture" dataMode="demo" profile={null}/></>);
