import type { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { CoreEnv } from '../../core/context.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey,idempotentMutation } from '../../core/idempotency.ts';
import { getTheme } from './service.ts';
import { registerThemeAi,applyThemeName,type NameAdoption } from './ai.ts';

export function registerThemeAiRoutes(api:Hono<CoreEnv>) {
  registerThemeAi();
  api.post('/themes/:themeId/adopt-name',c=>{
    const db=c.get('db'),context=c.get('context'),themeId=c.req.param('themeId');
    const input=c.get('input').body as NameAdoption;
    const version=expectedVersion(c.req.header('If-Match'));
    const result=idempotentMutation(db,{context,operation:`POST /api/v1/themes/${encodeURIComponent(themeId)}/adopt-name`,key:idempotencyKey(c.req.header('Idempotency-Key')),input:{...input,version}},{
      execute() {
        const theme=applyThemeName(db,context,themeId,version,input);
        return {status:200,body:{data:theme},headers:{ETag:`"${theme.version}"`},resource:{type:'theme',id:theme.id}};
      },
      replay(receipt) {
        const theme=getTheme(db,context.personId,receipt.resource!.id);
        return {status:200,body:{data:theme},headers:{ETag:`"${theme.version}"`}};
      },
    });
    for (const [key,value] of Object.entries(result.headers??{})) c.header(key,value);
    return c.body(JSON.stringify(result.body),result.status as ContentfulStatusCode,{'Content-Type':'application/json'});
  });
}
