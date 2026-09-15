import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { PluginError } from './types.ts';
const fragment = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/PLUGINS.json',import.meta.url),'utf8'));
const ajv = new Ajv2020({ strict:false,allErrors:true });
addFormats(ajv);
const validators = new Map<string,ReturnType<Ajv2020['compile']>>();
export function validatePluginBody<T>(name: string, body: unknown): T {
  if (!fragment.schemas[name]) throw new Error(`Unknown plugin schema ${name}`);
  let validate=validators.get(name);
  if (!validate) {
    validate=ajv.compile({components:{schemas:fragment.schemas},$ref:`#/components/schemas/${name}`});
    validators.set(name,validate);
  }
  if (!validate(body)) throw new PluginError(422,'VALIDATION_FAILED','入力内容を確認してください',{fields:validate.errors});
  return body as T;
}
