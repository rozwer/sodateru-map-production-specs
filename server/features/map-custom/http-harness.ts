// Runs the real CORE app/identity/DB with an officially composed feature contract.
// This only selects an isolated verification environment; it does not implement a runtime or fake API.
import {serve} from '@hono/node-server';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../../app/app.ts';
import {loadFeatures} from '../../core/features.ts';
import {openDatabases} from '../../db/connection.ts';
import {loadLocalIdentity,seedProfiles} from '../../core/session.ts';
const directory=process.env.MAP_CUSTOM_TEST_DIR;
if(!directory) throw new Error('Set MAP_CUSTOM_TEST_DIR to an isolated test directory');
const root=fileURLToPath(new URL('../../../',import.meta.url));
const features=await loadFeatures(resolve(root,'server'));
const dbs=openDatabases({livePath:resolve(directory,'live.sqlite'),demoPath:resolve(directory,'demo.sqlite'),migrations:features.flatMap(f=>f.migrations??[])});
const identity=loadLocalIdentity(resolve(directory,'profiles.json'));
if(!identity.profiles.some(p=>p.key==='other')) identity.profiles.push({key:'other',id:'map-custom-e2e-other',name:'別の本人'});
seedProfiles(dbs,identity.profiles);
const app=createApp({databases:dbs,identity,features,contract:JSON.parse(readFileSync(resolve(directory,'openapi.json'),'utf8'))});
const server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:Number(process.env.SODATERU_PORT??'3037')},a=>console.log(JSON.stringify({ready:true,port:a.port,features:features.map(f=>f.id)})));
process.once('SIGTERM',()=>server.close(()=>{dbs.close();process.exit(0);}));
process.once('SIGINT',()=>server.close(()=>{dbs.close();process.exit(0);}));
