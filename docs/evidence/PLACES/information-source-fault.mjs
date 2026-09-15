// Test-only DB fault injection, loaded only by the isolated smoke server.
// The real INFORMATION service and HTTP routes remain unchanged.
import {DatabaseSync} from "node:sqlite";
const prepare=DatabaseSync.prototype.prepare;
DatabaseSync.prototype.prepare=function(sql){
 if(sql.includes("FROM records r JOIN people")&&sql.endsWith(" AND r.person_id = ?"))throw new Error("test-only private database diagnostic");
 return prepare.call(this,sql);
};
