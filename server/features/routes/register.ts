import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { DatabaseSync } from 'node:sqlite';
import { defineFeature } from '../../core/features.ts';
import type { CoreEnv } from '../../core/context.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { idempotentMutation, type StoredResult } from '../../core/idempotency.ts';
import { createRoutesService } from './index.ts';
import { RouteFault, type RouteInput, type RoutePreview } from './types.ts';

type Job = { state: 'pending' | 'complete' | 'failed'; expiresAt: number; previews?: RoutePreview[]; error?: unknown };
const jobsByDb = new WeakMap<DatabaseSync, Map<string, Job>>();
function common(error: unknown): never {
  if (error instanceof RouteFault) throw new CommonError(error.code === 'INVALID_INPUT' ? 'VALIDATION_FAILED' : error.code, error.message, [429,503,504].includes(error.status), error.details, error.status);
  throw error;
}
function response(c: Context<CoreEnv>, result: StoredResult) {
  for (const [key, value] of Object.entries(result.headers ?? {})) c.header(key, value);
  return c.body(JSON.stringify(result.body ?? null), result.status as ContentfulStatusCode, { 'Content-Type': 'application/json' });
}
const httpPreview = ({previewId,...preview}: RoutePreview) => ({resultId:previewId,...preview});
export default defineFeature({
  id: 'routes',
  register(api) {
    const search = (compare: boolean) => async (c: Context<CoreEnv>) => {
      try {
        const db = c.get('db'), context = c.get('context'), input = c.get('input').body as RouteInput;
        if (!jobsByDb.has(db)) jobsByDb.set(db, new Map());
        const jobs = jobsByDb.get(db)!;
        for (const [key, value] of jobs) if (value.expiresAt <= Date.now()) jobs.delete(key);
        let created = false;
        // CORE persists only the accepted execution id; no provider payload is written.
        const accepted = idempotentMutation(db, {context, operation:`POST ${c.req.path}`, key:c.req.header('Idempotency-Key')!, input}, {
          execute() {
            created = true;
            const id = randomUUID(), expiresAt = Date.now() + 900_000;
            jobs.set(id, {state:'pending',expiresAt});
            return {status:202, resource:{type:'route-search',id}, expiresAt};
          },
          replay: value => value,
        });
        const job = jobs.get(accepted.resource!.id);
        if (!job) throw new CommonError('RESULT_EXPIRED','経路検索の一時結果がありません。新しい操作IDで検索してください。');
        if (!created && job.state === 'pending') throw new CommonError('BUSY','同じ経路検索を処理しています。',true);
        const service = createRoutesService(db);
        if (created) {
          try {
            job.previews = compare ? await service.compareRoutes(context,input) : [await service.previewRoute(context,input)];
            job.state = 'complete';
          } catch(error) { job.state = 'failed'; job.error = error; }
        }
        if (job.state === 'failed') throw job.error;
        const previews = job.previews!.map(p => service.revalidatePreview(context,p.previewId));
        return c.json({data:compare ? {items:previews.map(httpPreview)} : httpPreview(previews[0]!)});
      } catch(error) { common(error); }
    };
    api.post('/route-searches',search(false));
    api.post('/route-comparisons',search(true));
    api.get('/saved-routes', c => {
      try {
        const query = c.get('input').query;
        return c.json(createRoutesService(c.get('db')).listSavedRoutes(c.get('context'), {limit:query.limit as number | undefined,cursor:query.cursor as string | undefined}));
      } catch(error) { common(error); }
    });
    api.post('/saved-routes', c => {
      try {
        const db=c.get('db'), context=c.get('context'), input=c.get('input').body as {id:string;resultId:string;title:string};
        const service=createRoutesService(db);
        const result=idempotentMutation(db,{context,operation:'POST /api/v1/saved-routes',key:c.req.header('Idempotency-Key')!,input},{
          execute() {
            const saved=service.saveRoute(context,{id:input.id,previewId:input.resultId,title:input.title});
            return {status:saved.created?201:200,body:{data:saved.data},resource:{type:'route',id:saved.data.id},headers:{ETag:`"${saved.data.version}"`,Location:`/api/v1/saved-routes/${encodeURIComponent(saved.data.id)}`}};
          },
          replay(result) {
            const route=service.getSavedRoute(context,result.resource!.id,true);
            return {status:200,body:{data:route},headers:{ETag:`"${route.version}"`}};
          },
        });
        return response(c,result);
      } catch(error) { common(error); }
    });
    api.get('/saved-routes/:routeId', c => {
      try {
        const route=createRoutesService(c.get('db')).getSavedRoute(c.get('context'),c.req.param('routeId'));
        c.header('ETag',`"${route.version}"`); return c.json({data:route});
      } catch(error) { common(error); }
    });
    api.patch('/saved-routes/:routeId', c => {
      try {
        const {resultId,...patch}=c.get('input').body as any;
        const route=createRoutesService(c.get('db')).updateRoute(c.get('context'),c.req.param('routeId'),{...patch,...(resultId===undefined?{}:{previewId:resultId})},expectedVersion(c.req.header('If-Match')));
        c.header('ETag',`"${route.version}"`); return c.json({data:route});
      } catch(error) { common(error); }
    });
    api.delete('/saved-routes/:routeId', c => {
      try {
        createRoutesService(c.get('db')).deleteRoute(c.get('context'),c.req.param('routeId'),expectedVersion(c.req.header('If-Match')));
        return c.body(null,204);
      } catch(error) { common(error); }
    });
  },
});
