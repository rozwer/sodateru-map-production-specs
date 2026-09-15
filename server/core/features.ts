import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Hono } from 'hono';
import type { Databases } from '../db/connection.ts';
import { transaction, type Migration } from '../db/migrate.ts';
import type { CoreEnv } from './context.ts';
import type { LocalIdentity } from './session.ts';

export interface CoreServices {
  databases: Databases;
  identity: LocalIdentity;
  transaction: typeof transaction;
}
export interface Feature {
  id: string;
  migrations?: readonly Migration[];
  register(api: Hono<CoreEnv>, services: CoreServices): void;
}
export function defineFeature(feature: Feature): Feature { return feature; }

/** A conventional register.ts per feature; no central list edits for new features. */
export async function loadFeatures(root: string): Promise<Feature[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.name === 'register.ts') files.push(path);
    }
  }
  await visit(root);
  const features: Feature[] = [];
  const ids = new Set<string>();
  for (const path of files.sort()) {
    const feature = (await import(pathToFileURL(path).href)).default as Feature;
    if (!feature || typeof feature.id !== 'string' || typeof feature.register !== 'function' || ids.has(feature.id)) {
      throw new Error(`Invalid or duplicate feature registration: ${path}`);
    }
    ids.add(feature.id); features.push(feature);
  }
  return features;
}
