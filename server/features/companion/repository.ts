import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export type DraftInput = { name: string; appearance: string; referenceImageId: string | null };
export type SettingsInput = { selectedCompanionId: string | null; visible: boolean; size: 'small' | 'medium'; reducedMotion: boolean };
export type InspectedPackage = { name: string; manifest: Record<string, unknown>; requiredActions: string[]; zip: Uint8Array; atlas: Uint8Array; mime: 'image/png' | 'image/webp' };
type Row = Record<string, any>;

/** Domain failures are converted to CORE CommonError at the HTTP boundary. */
export class CompanionFailure extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
const fail = (code: string): never => { throw new CompanionFailure(code); };
const present = (row: Row | undefined): Row => row ?? fail('NOT_FOUND');
const version = (row: Row, expected: number) => {
  if (!Number.isSafeInteger(expected) || expected < 1) fail('VERSION_REQUIRED');
  if (row.version !== expected) fail('VERSION_CONFLICT');
};
const draftDTO = (r: Row) => ({id:r.id, name:r.name, appearance:r.appearance, referenceImageId:r.reference_image_id, version:r.version, createdAt:r.created_at, updatedAt:r.updated_at});
const petDTO = (r: Row) => ({id:r.id, importId:r.import_id, name:r.name, source:r.source, version:r.version, createdAt:r.created_at});
const importDTO = (r: Row) => ({id:r.id, name:r.name, manifest:JSON.parse(r.manifest_json), requiredActions:JSON.parse(r.required_actions_json) as string[], confirmedActions:JSON.parse(r.confirmed_actions_json) as string[], version:r.version, createdAt:r.created_at});

/** The caller supplies the mode-specific CORE database and resolved person. */
export class CompanionRepository {
  db: DatabaseSync;
  personId: string;
  constructor(db: DatabaseSync, personId: string) { this.db = db; this.personId = personId; }

  private draftInput(input: DraftInput) {
    if (!input || typeof input.name !== 'string' || typeof input.appearance !== 'string' || [...input.name].length > 20 || [...input.appearance].length > 200) fail('INVALID_INPUT');
    if (input.referenceImageId !== null && typeof input.referenceImageId !== 'string') fail('INVALID_INPUT');
  }
  createDraft(input: DraftInput) {
    this.draftInput(input);
    const id = randomUUID(), now = new Date().toISOString();
    this.db.prepare('INSERT INTO companion_drafts(id,person_id,name,appearance,reference_image_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,this.personId,input.name,input.appearance,input.referenceImageId,now,now);
    return this.getDraft(id);
  }
  getDraft(id: string) { return draftDTO(present(this.db.prepare('SELECT * FROM companion_drafts WHERE id=? AND person_id=?').get(id,this.personId))); }
  listDrafts() { return this.db.prepare('SELECT * FROM companion_drafts WHERE person_id=? ORDER BY updated_at DESC,id').all(this.personId).map(draftDTO); }
  updateDraft(id: string, expected: number, input: DraftInput) {
    this.draftInput(input); version(this.getDraft(id),expected);
    const result = this.db.prepare('UPDATE companion_drafts SET name=?,appearance=?,reference_image_id=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=?').run(input.name,input.appearance,input.referenceImageId,new Date().toISOString(),id,this.personId,expected);
    if (result.changes !== 1) fail('VERSION_CONFLICT');
    return this.getDraft(id);
  }
  /** Called only after the archive inspector succeeds; never exposes raw intake. */
  saveInspectedImport(input: InspectedPackage) {
    if (!input.requiredActions.length || new Set(input.requiredActions).size !== input.requiredActions.length) fail('INVALID_PACKAGE');
    const id = randomUUID();
    this.db.prepare('INSERT INTO companion_imports(id,person_id,name,manifest_json,required_actions_json,zip,atlas,mime,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,this.personId,input.name,JSON.stringify(input.manifest),JSON.stringify(input.requiredActions),input.zip,input.atlas,input.mime,new Date().toISOString());
    return this.getImport(id);
  }
  getImport(id: string) { return importDTO(present(this.db.prepare('SELECT * FROM companion_imports WHERE id=? AND person_id=?').get(id,this.personId))); }
  importMedia(id: string, kind: 'zip' | 'atlas') {
    const r = present(this.db.prepare('SELECT zip,atlas,mime FROM companion_imports WHERE id=? AND person_id=?').get(id,this.personId));
    return {bytes:r[kind] as Uint8Array,mime:kind === 'zip' ? 'application/zip' : r.mime};
  }
  confirmImport(id: string, expected: number, actions: string[]) {
    const item = this.getImport(id); version(item,expected);
    if (!Array.isArray(actions) || actions.some(a => !item.requiredActions.includes(a))) fail('INVALID_INPUT');
    const confirmed = [...new Set([...item.confirmedActions,...actions])];
    const result = this.db.prepare('UPDATE companion_imports SET confirmed_actions_json=?,version=version+1 WHERE id=? AND person_id=? AND version=?').run(JSON.stringify(confirmed),id,this.personId,expected);
    if (result.changes !== 1) fail('VERSION_CONFLICT');
    return this.getImport(id);
  }
  registerImport(id: string, source: 'import' | 'generation' = 'import') {
    const item = this.getImport(id);
    if (source === 'import' && this.db.prepare('SELECT id FROM companion_generations WHERE person_id=? AND result_import_id=?').get(this.personId,id)) fail('GENERATION_ADOPTION_REQUIRED');
    if (!item.requiredActions.every(a => item.confirmedActions.includes(a))) fail('PREVIEW_REQUIRED');
    // One atomic write; an import has a stable registration even on repeat calls.
    this.db.prepare('INSERT INTO companions(id,person_id,import_id,name,source,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(import_id) DO NOTHING').run(randomUUID(),this.personId,id,item.name,source,new Date().toISOString());
    return petDTO(present(this.db.prepare('SELECT * FROM companions WHERE import_id=? AND person_id=?').get(id,this.personId)));
  }
  getCompanion(id: string) { return petDTO(present(this.db.prepare('SELECT * FROM companions WHERE id=? AND person_id=?').get(id,this.personId))); }
  listCompanions() { return this.db.prepare('SELECT * FROM companions WHERE person_id=? ORDER BY created_at,id').all(this.personId).map(petDTO); }
  getSettings() {
    this.db.prepare('INSERT INTO companion_settings(person_id) VALUES(?) ON CONFLICT(person_id) DO NOTHING').run(this.personId);
    const r = present(this.db.prepare('SELECT * FROM companion_settings WHERE person_id=?').get(this.personId));
    return {selectedCompanionId:r.selected_companion_id,visible:Boolean(r.visible),size:r.size,reducedMotion:Boolean(r.reduced_motion),version:r.version};
  }
  updateSettings(expected: number, input: SettingsInput) {
    version(this.getSettings(),expected);
    if (!input || typeof input.visible !== 'boolean' || typeof input.reducedMotion !== 'boolean' || !['small','medium'].includes(input.size)) fail('INVALID_INPUT');
    if (input.selectedCompanionId !== null) this.getCompanion(input.selectedCompanionId);
    const result = this.db.prepare('UPDATE companion_settings SET selected_companion_id=?,visible=?,size=?,reduced_motion=?,version=version+1 WHERE person_id=? AND version=?').run(input.selectedCompanionId,Number(input.visible),input.size,Number(input.reducedMotion),this.personId,expected);
    if (result.changes !== 1) fail('VERSION_CONFLICT');
    return this.getSettings();
  }
}
