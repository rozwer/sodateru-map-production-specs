import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../src/app/App';
import { api } from '../../../src/app/api';
import { MapRenderer } from '../../../src/map/MapRenderer';
import { screens, MapToolbar } from '../../../src/features/map/screens';
import type { Person, LocalProfile } from '../../../packages/api-client/index';

// Dedicated local QA databases. No API response is replaced by a fixture.
function BrowserHarness() {
 const [person,setPerson] = useState<Person|null>(null);
 const [profiles,setProfiles] = useState<LocalProfile[]>([]);
 const [error,setError] = useState<string|null>(null);
 const [busy,setBusy] = useState(false);
 useEffect(()=> { const controller = new AbortController();
  void api.request('getSessionProfiles',{signal:controller.signal}).then(data=>setProfiles(data.items)).catch(error=>{if(!controller.signal.aborted)setError(error.message)});
  void api.request('getSession',{signal:controller.signal}).then(data=>setPerson(data.data.person)).catch(()=>{});
  return ()=>controller.abort();
 },[]);
 const start=async(profileKey:string)=> { setBusy(true);setError(null);try {const {data}=await api.request('postSession',{body:{profileKey},idempotencyKey:crypto.randomUUID()});setPerson(data.person);} catch(error){setError(error instanceof Error?error.message:'接続できませんでした。')}finally{setBusy(false);} };
 if(person)return <App screens={screens} MapRenderer={MapRenderer} MapToolbar={MapToolbar} scopeKey={`live:${person.id}`} dataMode="live" profile={person}/>;
 return <section style={{padding:24,maxWidth:500}}><h1>UI-MAP 実API確認</h1><p>専用のローカル確認DBを使用します。ここで選んだ本人の状態で地図を開きます。</p>{profiles.map(profile=><button key={profile.profileKey} disabled={busy} onClick={()=>void start(profile.profileKey)}>{profile.name}で開く</button>)}{error&&<p role="alert">{error}</p>}</section>;
}
createRoot(document.getElementById('root')!).render(<BrowserHarness/>);
