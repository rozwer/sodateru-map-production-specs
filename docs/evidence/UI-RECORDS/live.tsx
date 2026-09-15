import { useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../src/app/App';
import { api } from '../../../src/app/api';
import { screens as records } from '../../../src/features/records/screens';
import { screens as activity } from '../../../src/features/activity/screens';
import { errorText } from '../../../src/features/records/record-flow';
import type { Person } from '../../../packages/api-client/index';

function LiveCheck(){
 const [person,setPerson]=useState<Person|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void api.request('getSession',{}).then(({data})=>setPerson(data.person)).catch(()=>{});},[]);
 const start=async()=>{setBusy(true);setError('');try{const profiles=await api.request('getSessionProfiles',{});const profile=profiles.items[0];if(!profile)throw new Error('確認用の本人がありません。');const {data}=await api.request('postSession',{body:{profileKey:profile.profileKey},idempotencyKey:crypto.randomUUID()});setPerson(data.person);}catch(error){setError(errorText(error));}finally{setBusy(false);}};
 return person?<App screens={[...records,...activity]} scopeKey={`${person.id}:live`} profile={person} dataMode="live"/>:<main style={{padding:24}}><h1>UI-RECORDS 実API確認</h1><p>専用の確認用DBに保存します。表示専用プレビューとは別です。</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>void start()}>確認用の本人で開始</button></main>;
}
createRoot(document.getElementById('root')!).render(<LiveCheck/>);
