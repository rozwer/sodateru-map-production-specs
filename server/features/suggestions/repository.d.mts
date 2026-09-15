import type {DatabaseSync} from 'node:sqlite';
import type {RequestContext} from '../../core/context.ts';
import type {SelfCheckin} from '../../../packages/api-client/index.ts';
export function listSelfCheckins(db:DatabaseSync,context:Pick<RequestContext,'personId'|'dataMode'>,query?:{date?:string;cursor?:string;limit?:number}):{items:SelfCheckin[];nextCursor:string|null};
