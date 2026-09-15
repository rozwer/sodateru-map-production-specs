import { PluginError, type PluginContext, type PluginSetting } from './types.ts';
export function pluginSettingPage(items: PluginSetting[], context: PluginContext, query: {cursor?:string;limit?:string}) {
  const limit=query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(limit) || limit<1 || limit>100) throw new PluginError(400,'INVALID_QUERY','limitは1〜100で指定してください');
  let lastId='';
  if (query.cursor) {
    try {
      if (query.cursor.length>2048 || !/^[A-Za-z0-9_-]+$/.test(query.cursor)) throw new Error();
      const decoded=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));
      if (decoded.personId!==context.personId || decoded.dataMode!==context.dataMode || typeof decoded.lastId!=='string' || decoded.lastId.length>80) throw new Error();
      lastId=decoded.lastId;
    } catch { throw new PluginError(400,'INVALID_CURSOR','この一覧に使えるcursorではありません'); }
  }
  const remaining=items.filter(item=>item.id>lastId), page=remaining.slice(0,limit);
  const nextCursor=remaining.length>limit ? Buffer.from(JSON.stringify({personId:context.personId,dataMode:context.dataMode,lastId:page.at(-1)!.id})).toString('base64url') : null;
  return {items:page,nextCursor};
}
