import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../../src/app/App';
import {api} from '../../../src/app/api';
import {screens} from '../../../src/features/reflection/screens';
import type {OperationOutput} from '../../../packages/api-client';
function Live(){const [session,setSession]=useState<OperationOutput<'getSession'>['data']>();const [profiles,setProfiles]=useState<{profileKey:string;name:string}[]>([]);const [error,setError]=useState('');const [key]=useState(()=>crypto.randomUUID());useEffect(()=>{void api.request('getSession',{}).then(r=>setSession(r.data)).catch(()=>api.request('getSessionProfiles',{}).then(r=>setProfiles(r.items)).catch(e=>setError(e.message)));},[]);const login=async(profileKey:string)=>{try{setSession((await api.request('postSession',{body:{profileKey},idempotencyKey:key})).data);}catch(e){setError(e instanceof Error?e.message:'本人を開始できませんでした。');}};return session?<App screens={screens} scopeKey={`${session.person.id}:${session.dataMode}`} dataMode={session.dataMode} profile={{name:session.person.name,bio:'',avatarUrl:null}}/>:<main style={{padding:24}}><h1>振り返りの実API確認</h1><p>UI-REFLECTION専用DB・127.0.0.1:3012を使用します。モック応答は使いません。</p>{profiles.map(p=><button key={p.profileKey} onClick={()=>void login(p.profileKey)}>{p.name}で開始</button>)}{error&&<p role="alert">{error}</p>}</main>;}
createRoot(document.getElementById('root')!).render(<Live/>);
