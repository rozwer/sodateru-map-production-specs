export function comparisonErrors(result: any, input: {fromRecordIds:string[];toRecordIds:string[]}, evidence: {id:string;recordId:string}[]): string[] {
  const errors: string[] = [];
  const allowed = new Map(evidence.map(e=>[e.id,e.recordId]));
  const pairs = new Set<string>();
  for (const m of result.mappings) {
    if (!input.fromRecordIds.includes(m.fromRecordId) || !input.toRecordIds.includes(m.toRecordId) || m.fromRecordId===m.toRecordId) errors.push('比較の左右が入力と一致しません');
    const pair = JSON.stringify([m.fromRecordId,m.toRecordId,m.relation]);
    if (pairs.has(pair)) errors.push('同じ対応が重複しています');
    pairs.add(pair);
    for (const id of m.evidenceIds) {
      const recordId=allowed.get(id);
      if (!recordId || (recordId!==m.fromRecordId && recordId!==m.toRecordId)) errors.push('この組に属さない引用です');
    }
    if (!m.evidenceIds.length) errors.push('比較の根拠がありません');
    if (m.rejected !== false) errors.push('本人判断を生成できません');
  }
  return errors;
}
export function comparisonResult(result: any) {
  const common: string[]=[]; const differences:string[]=[];
  for (const mapping of result.mappings) {
    (['same-place-same-purpose','different-place-same-role'].includes(mapping.relation)? common : differences).push(mapping.explanation);
  }
  return {common,differences,unknown:result.mappings.length?[]:['比較できる根拠が不足しています']};
}
export function extractPatch(result: any, fields: string[]): {purposes?:string[];impression?:string} {
  const patch: {purposes?:string[];impression?:string} = {};
  if (fields.includes('purpose') && result.purpose) patch.purposes=[result.purpose];
  if (fields.includes('reason') && result.reason!==null) patch.impression=result.reason;
  return patch;
}

export type EvidenceState = 'current'|'changed'|'unavailable';
export function questionDisplay<T extends {questionText:string}>(question:T,checks:{state:string}[]):Omit<T,'questionText'>&{questionText:string|null;evidenceState:EvidenceState} {
 const evidenceState:EvidenceState=checks.some(c=>c.state==='unavailable')?'unavailable':checks.some(c=>c.state==='changed')?'changed':'current';
 return {...question,questionText:evidenceState==='current'?question.questionText:null,evidenceState};
}
export function comparisonConditions(input:{fromRecordIds:string[];toRecordIds:string[]},text:string) {
 return {fromRecordIds:[...input.fromRecordIds].sort(),toRecordIds:[...input.toRecordIds].sort(),text};
}
