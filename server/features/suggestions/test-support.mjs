import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Schema-derived SQLite fixture. Runtime/HTTP/provider proof is a separate integration check.
export function fixture() {
  const dir=mkdtempSync(join(tmpdir(),'suggestions-test-'));
  const path=join(dir,'live.sqlite');
  const db=new DatabaseSync(path);
  const common=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/01_DB/common.json',import.meta.url),'utf8')).columns;
  for (const name of ['11_self_checkins','12_suggestions','15_visits']) {
    const spec=JSON.parse(readFileSync(new URL(`../../../docs/01_requirements/01_DB/${name}.json`,import.meta.url),'utf8'));
    db.exec(`CREATE TABLE ${spec.table} (${Object.entries({...common,...spec.columns}).map(([key,value])=>`${key} ${value.type}${key==='id'?' PRIMARY KEY':''}${value.nullable===false?' NOT NULL':''}`).join(',')})`);
  }
  db.exec(readFileSync(new URL('../../db/migrations/suggestions/001-suggestions.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../../db/migrations/suggestions/002-batch-runs.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../../db/migrations/suggestions/003-detail-view.sql',import.meta.url),'utf8'));
  const transaction=(connection,fn)=>{connection.exec('BEGIN');try{const value=fn();connection.exec('COMMIT');return value;}catch(error){connection.exec('ROLLBACK');throw error;}};
  return {db,path,transaction,cleanup(){try{db.close();}catch{}rmSync(dir,{recursive:true,force:true});}};
}
