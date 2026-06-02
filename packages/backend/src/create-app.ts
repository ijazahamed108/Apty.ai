import type { Express } from 'express';
import { buildApp } from './app.js';
import { connectMongo, wereIndexesEnsured, markIndexesEnsured } from './db/mongo.js';
import { ensureIndexes } from './db/migrate.js';

let cachedApp: Express | null = null;

export async function createApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

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
