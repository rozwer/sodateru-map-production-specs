import { CommonError } from '../../core/errors.ts';

export const topics = [
  { topicKey: 'food', title: '食事', purposes: ['食事'], screenCategory: 'food' },
  { topicKey: 'rest', title: '休憩', purposes: ['休憩'], screenCategory: 'rest' },
  { topicKey: 'walk', title: '散歩', purposes: ['散歩'], screenCategory: 'walk' },
] as const;

export function topicByKey(key: string) {
  const topic = topics.find(value => value.topicKey === key);
  if (!topic) throw new CommonError('VALIDATION_FAILED', '登録されていない話題です', false, undefined, 422);
  return topic;
}

export function knowledgeQuery(input: URLSearchParams) {
  const query = new URLSearchParams(input);
  const category = query.get('category');
  if (category !== null) {
    const topic = topicByKey(category);
    if (query.has('topicKey') && query.get('topicKey') !== topic.topicKey) {
      throw new CommonError('VALIDATION_FAILED', '分類と話題が一致しません', false, undefined, 422);
    }
    query.set('topicKey', topic.topicKey);
    if (!query.has('purposes')) topic.purposes.forEach(purpose => query.append('purposes', purpose));
    query.delete('category');
  }
  return query;
}
