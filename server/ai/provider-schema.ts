/** Keep only reachable local definitions; unused draft-specific definitions must not reach the provider. */
export function providerSchema(schema:object):object{
 const root=structuredClone(schema) as any;
 const required=new Set<string>();
 const scan=(value:any)=>{
  if(Array.isArray(value)){for(const item of value)scan(item);return;}
  if(!value||typeof value!=='object')return;
  // Structured-output provider rejects uniqueItems; the engine still validates the original schema.
  if(value.type==='array'||Array.isArray(value.type)&&value.type.includes('array'))delete value.uniqueItems;
  if(typeof value.$ref==='string'&&/^#\/(definitions|\$defs)\//.test(value.$ref)){
   const path=value.$ref.split('/'),key=path[1]+'/'+path[2];
   if(!required.has(key)){required.add(key);const definition=root[path[1]]?.[path[2]];if(definition)scan(definition);}
  }
  for(const [key,item] of Object.entries(value))if(key!=='definitions'&&key!=='$defs')scan(item);
 };
 scan(root);
 for(const container of ['definitions','$defs'])if(root[container]){
  root[container]=Object.fromEntries(Object.entries(root[container]).filter(([name])=>required.has(container+'/'+name)));
  if(!Object.keys(root[container]).length)delete root[container];
 }
 return root;
}
