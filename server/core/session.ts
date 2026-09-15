import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { DataMode, Databases } from '../db/connection.ts';
import { transaction } from '../db/migrate.ts';
import { CommonError } from './errors.ts';

export interface LocalProfile { key: string; id: string; name: string }
export interface LocalIdentity { version: 1; secret: string; profiles: LocalProfile[] }
export function loadLocalIdentity(path: string): LocalIdentity {
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    const identity: LocalIdentity = { version: 1, secret: randomBytes(32).toString('hex'), profiles: [{ key: 'self', id: randomUUID(), name: '自分' }] };
    try { writeFileSync(path, JSON.stringify(identity, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  }
  const identity = JSON.parse(readFileSync(path, 'utf8')) as LocalIdentity;
  if (identity.version !== 1 || typeof identity.secret !== 'string' || identity.secret.length < 32 || !Array.isArray(identity.profiles) || !identity.profiles.length) {
    throw new Error('Invalid local identity configuration');
  }
  const keys = new Set(), ids = new Set();
  for (const profile of identity.profiles) {
    if (typeof profile.key !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(profile.key) ||
        typeof profile.id !== 'string' || !profile.id.trim() || Array.from(profile.id).length > 80 ||
        typeof profile.name !== 'string' || !profile.name.trim() || Array.from(profile.name).length > 200 ||
        keys.has(profile.key) || ids.has(profile.id)) throw new Error('Invalid or duplicate local profile');
    keys.add(profile.key); ids.add(profile.id);
  }
  return identity;
}

export function seedProfiles(databases: Databases, profiles: readonly LocalProfile[]): void {
  for (const db of [databases.live, databases.demo]) transaction(db, () => {
    for (const profile of profiles) {
      const binding = db.prepare('SELECT person_id FROM core_local_profiles WHERE profile_key=?').get(profile.key);
      if (binding) {
        if (binding.person_id !== profile.id) throw new Error('A local profile cannot silently change person id');
        continue; // A deleted person must not be resurrected by a restart.
      }
      const now = Date.now();
      db.prepare(`INSERT INTO people(id,version,created_at,updated_at,name,bio,avatar_path)
        VALUES (?,1,?,?,?,'',NULL) ON CONFLICT(id) DO NOTHING`).run(profile.id, now, now, profile.name);
      db.prepare('INSERT INTO core_local_profiles VALUES (?,?)').run(profile.key, profile.id);
    }
  });
}

export interface Person {
  id: string; version: number; createdAt: number; updatedAt: number;
  name: string; bio: string; avatarUrl: string | null;
}
export function getPerson(db: DatabaseSync, personId: string): Person {
  const row = db.prepare('SELECT id,version,created_at,updated_at,name,bio,avatar_path FROM people WHERE id=?').get(personId);
  if (!row) throw new CommonError('FORBIDDEN', '登録された本人を確認できません。');
  return { id: String(row.id), version: Number(row.version), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), name: String(row.name), bio: String(row.bio), avatarUrl: row.avatar_path === null ? null : String(row.avatar_path) };
}
export const cookieName = (mode: DataMode): string => `sodateru_session_${mode}`;
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
/** Replay produces the same secret without storing a plaintext token in a receipt. */
export function sessionToken(identity: LocalIdentity, mode: DataMode, profileKey: string, key: string): string {
  return createHmac('sha256', identity.secret).update(JSON.stringify([mode, profileKey, key])).digest('base64url');
}
export interface Session { token_hash: string; person_id: string; profile_key: string; version: number; created_at: number; expires_at: number }
export function resolveSession(db: DatabaseSync, token: string | undefined): Session {
  if (!token) throw new CommonError('PERSON_REQUIRED', '本人を選択してください。');
  const session = db.prepare('SELECT * FROM core_sessions WHERE token_hash=?').get(hashToken(token)) as Session | undefined;
  if (!session || session.expires_at <= Date.now()) throw new CommonError('PERSON_REQUIRED', '本人を選択してください。');
  getPerson(db, session.person_id);
  return session;
}
