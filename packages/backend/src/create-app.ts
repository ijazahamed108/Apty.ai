import type { Express } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { buildApp } from './app.js';
import { connectMongo, wereIndexesEnsured, markIndexesEnsured } from './db/mongo.js';
import { ensureIndexes } from './db/migrate.js';

let cachedApp: Express | null = null;

function loadLocalEnv(): void {
  const candidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];
  const envPath = candidates.find((candidate) => existsSync(candidate));

  if (envPath) {
    config({ path: envPath, override: false });
  }
}

export async function createApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

  loadLocalEnv();

  const jwtSecret = process.env.JWT_SECRET;
  const mongodbUri = process.env.MONGODB_URI;
  const mongodbDb = process.env.MONGODB_DB ?? 'miniapty';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }
  if (!mongodbUri) {
    throw new Error('MONGODB_URI is required');
  }

  const db = await connectMongo(mongodbUri, mongodbDb);
  if (!wereIndexesEnsured()) {
    await ensureIndexes(db);
    markIndexesEnsured();
  }

  cachedApp = buildApp({ db, jwtSecret });
  return cachedApp;
}
