/** Test entrypoint: actual shared CORE and feature discovery, explicit temporary contract. */
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabases } from "../../db/connection.ts";
import { loadFeatures } from "../../core/features.ts";
import { loadLocalIdentity, seedProfiles } from "../../core/session.ts";
import { createApp } from "../../app/app.ts";
const root=fileURLToPath(new URL("../../../",import.meta.url));
if(!process.env.BIKE_E2E_CONTRACT)throw Error("BIKE_E2E_CONTRACT is required for this test entrypoint");
const features=await loadFeatures(resolve(root,"server"));
const databases=openDatabases({livePath:process.env.SODATERU_DB_PATH!,demoPath:process.env.SODATERU_DEMO_DB_PATH!,migrations:features.flatMap(f=>f.migrations??[])});
const identity=loadLocalIdentity(process.env.SODATERU_PROFILES_PATH!);
seedProfiles(databases,identity.profiles);
const contract=JSON.parse(readFileSync(resolve(root,process.env.BIKE_E2E_CONTRACT),"utf8"));
const app=createApp({databases,identity,features,contract});
const server=serve({fetch:app.fetch,hostname:"127.0.0.1",port:0},info=>console.log(JSON.stringify({event:"ready",origin:`http://127.0.0.1:${info.port}`})));
function stop(){server.close(()=>{databases.close();process.exit(0);});}
process.once("SIGINT",stop);process.once("SIGTERM",stop);
