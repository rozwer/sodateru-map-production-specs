import { CommonError } from '../../core/errors.ts';
import { registerRecordExtension } from '../records/extensions.ts';
import { readMemoPresentation, writeMemoPresentation } from './service.ts';

let registered = false;
export function registerMemoExtension() {
  if (registered) return;
  registerRecordExtension({
    read(db, personId, recordId) {
      return {memo: readMemoPresentation(db, personId, recordId)};
    },
    write(db, personId, recordId, input) {
      const record = db.prepare('SELECT kind,body FROM records WHERE id=? AND person_id=?').get(recordId,personId);
      if (record?.kind === 'memo') {
        const previous=readMemoPresentation(db,personId,recordId);
        if ((input.memo !== undefined || previous) && [...String(record.body)].length > 200) throw new CommonError('VALIDATION_FAILED','メモ画面の本文は200文字以内です。',false,undefined,422);
        if (input.memo !== undefined) writeMemoPresentation(db,personId,recordId,input.memo);
      } else if (input.memo !== undefined) {
        throw new CommonError('VALIDATION_FAILED','memoはメモ記録にだけ指定できます。',false,undefined,422);
      }
    },
  });
  registered = true;
}
