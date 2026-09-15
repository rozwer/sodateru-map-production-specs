import type { DatabaseSync } from 'node:sqlite';
import { CommonError } from '../../core/errors.ts';
import type { RequestContext } from '../../core/context.ts';
import { createInformationService } from '../../information/service.ts';
import { normalizeQuery, queryFromUrl } from '../../information/query.ts';
import { knowledgeQuery } from './topics.ts';

export function communityQuery(url: URL) {
  const normalized = new URL(url);
  normalized.search = knowledgeQuery(url.searchParams).toString();
  const query = queryFromUrl(normalized);
  if (url.searchParams.get('category') === 'experiences') query.kind = 'experience';
  const bbox = normalized.searchParams.get('bbox');
  if (bbox !== null) {
    if (query.center || query.radiusM) throw new CommonError('VALIDATION_FAILED', '地図範囲と半径は同時に指定できません', false, undefined, 422);
    const values = bbox.split(',');
    if (values.length !== 4 || values.some(value => !value.trim())) throw new CommonError('VALIDATION_FAILED', 'bboxは4つの座標です', false, undefined, 422);
    const box = values.map(Number) as [number, number, number, number];
    if (!box.every(Number.isFinite) || Math.abs(box[0]) > 180 || Math.abs(box[2]) > 180 || Math.abs(box[1]) > 90 || Math.abs(box[3]) > 90 || box[0] > box[2] || box[1] > box[3]) {
      throw new CommonError('VALIDATION_FAILED', 'bboxの範囲または座標の順序が不正です', false, undefined, 422);
    }
    query.bbox = box as [number, number, number, number];
  }
  return normalizeQuery(query);
}

export function searchKnowledge(db: DatabaseSync, context: RequestContext, url: URL) {
  return createInformationService(db).searchRecords(context, communityQuery(url));
}

export function mapKnowledge(db: DatabaseSync, context: RequestContext, url: URL) {
  return createInformationService(db).mapRecords(context, communityQuery(url));
}

export function placeVoices(db: DatabaseSync, context: RequestContext, placeId: string, url: URL) {
  const query = communityQuery(url);
  if (!query.topicKey) throw new CommonError('VALIDATION_FAILED', 'topicKeyを指定してください', false, undefined, 422);
  return createInformationService(db).searchTopics(context, { ...query, placeId, topicKey: query.topicKey });
}
