import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { CommonError } from '../../core/errors.ts';
import { DEFAULT_STYLE, DEFAULT_LAYERS, type MapObject, type MapObjectInput, type MapSettings, type MapStyle, type MapLayers } from './domain.ts';

type Row = Record<string, any>;
function missing(): never { throw new CommonError('NOT_FOUND', '対象が見つかりません。', false, undefined, 404); }
function conflict(): never { throw new CommonError('VERSION_CONFLICT', '保存後に内容が変更されています。', false, undefined, 412); }
const objectDto = (r: Row): MapObject => ({ id:r.id, name:r.name, memo:r.memo, color:r.color, size:r.size,
  position:{longitude:r.longitude,latitude:r.latitude},version:r.version,createdAt:r.created_at,updatedAt:r.updated_at });
const settingsDto = (r: Row): MapSettings => ({ id:r.id, version:r.version, style:JSON.parse(r.style_json),
  layers:JSON.parse(r.layers_json), createdAt:r.created_at, updatedAt:r.updated_at });

/** The caller owns the common synchronous transaction and the mode-specific DB. */
export class MapCustomRepository {
  constructor(readonly db: DatabaseSync, readonly context: Pick<RequestContext, 'personId' | 'dataMode'>) {}
  private get owner() { return [this.context.personId, this.context.dataMode] as const; }
  listObjects(): MapObject[] {
    return this.db.prepare('SELECT * FROM map_custom_objects WHERE person_id=? AND data_mode=? ORDER BY created_at,id').all(...this.owner).map(objectDto);
  }
  getObject(id: string): MapObject {
    const row = this.db.prepare('SELECT * FROM map_custom_objects WHERE id=? AND person_id=? AND data_mode=?').get(id,...this.owner);
    return row ? objectDto(row) : missing();
  }
  createObject(input: MapObjectInput): MapObject {
    const id = randomUUID(), now = Date.now();
    this.db.prepare(`INSERT INTO map_custom_objects(id,person_id,data_mode,name,memo,color,size,longitude,latitude,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,...this.owner,input.name,input.memo,input.color,input.size,input.position.longitude,input.position.latitude,now,now);
    return this.getObject(id);
  }
  updateObject(id: string, version: number, input: MapObjectInput): MapObject {
    this.getObject(id);
    const result = this.db.prepare(`UPDATE map_custom_objects SET name=?,memo=?,color=?,size=?,longitude=?,latitude=?,version=version+1,updated_at=?
      WHERE id=? AND person_id=? AND data_mode=? AND version=?`).run(input.name,input.memo,input.color,input.size,input.position.longitude,input.position.latitude,Date.now(),id,...this.owner,version);
    if (!result.changes) conflict();
    return this.getObject(id);
  }
  deleteObject(id: string, version: number): void {
    this.getObject(id);
    if (!this.db.prepare('DELETE FROM map_custom_objects WHERE id=? AND person_id=? AND data_mode=? AND version=?').run(id,...this.owner,version).changes) conflict();
  }
  getSettings(): MapSettings {
    let row = this.db.prepare('SELECT * FROM map_custom_settings WHERE person_id=? AND data_mode=?').get(...this.owner);
    if (!row) {
      const now = Date.now();
      this.db.prepare(`INSERT INTO map_custom_settings(id,person_id,data_mode,style_json,layers_json,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(person_id,data_mode) DO NOTHING`).run(randomUUID(),...this.owner,JSON.stringify(DEFAULT_STYLE),JSON.stringify(DEFAULT_LAYERS),now,now);
      row = this.db.prepare('SELECT * FROM map_custom_settings WHERE person_id=? AND data_mode=?').get(...this.owner);
    }
    return settingsDto(row!);
  }
  saveSettings(version: number, input: {style:MapStyle;layers:MapLayers}): MapSettings {
    this.getSettings();
    if (!this.db.prepare(`UPDATE map_custom_settings SET style_json=?,layers_json=?,version=version+1,updated_at=?
      WHERE person_id=? AND data_mode=? AND version=?`).run(JSON.stringify(input.style),JSON.stringify(input.layers),Date.now(),...this.owner,version).changes) conflict();
    return this.getSettings();
  }
}
