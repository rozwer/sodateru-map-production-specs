import { createTransferFeature } from './http.ts';
import { CommonError } from '../../core/errors.ts';

export default createTransferFeature(async (db, context) => {
  try {
    const { createTransferDependencies } = await import('./adapters.ts');
    return createTransferDependencies(db, context);
  } catch (error) {
    if ((error as {code?:string}).code === 'ERR_MODULE_NOT_FOUND') {
      throw new CommonError('PROVIDER_UNAVAILABLE','体験移植に必要な共通サービスを準備中です。',true,{},503);
    }
    throw error;
  }
});
