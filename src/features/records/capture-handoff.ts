/** In-memory handoff from the map camera. Files never enter a URL or localStorage. */
const captures = new Map<string, { scopeKey: string; files: File[] }>();

export function stageRecordCapture(files: File[], scopeKey: string): string | null {
  const media = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/')).slice(0, 100);
  if (!media.length) return null;
  for (const [id, capture] of captures) if (capture.scopeKey === scopeKey) captures.delete(id);
  const id = crypto.randomUUID();
  captures.set(id, { scopeKey, files: media });
  return id;
}

export function takeRecordCapture(id: string, scopeKey: string): File[] | null {
  const capture = captures.get(id);
  if (!capture || capture.scopeKey !== scopeKey) return null;
  captures.delete(id);
  return capture.files;
}

export function discardRecordCapture(id: string): void {
  captures.delete(id);
}
