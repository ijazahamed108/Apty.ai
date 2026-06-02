import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;
let indexesEnsured = false;

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function connectMongo(uri: string, dbName = 'miniapty'): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(uri, {
    maxPoolSize: isServerless ? 1 : 10,
    minPoolSize: isServerless ? 0 : 1,
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  db = client.db(dbName);

  client.on('error', (err) => {
    console.error('Unexpected MongoDB client error', err);
  });

  return db;
}

export function markIndexesEnsured(): void {
  indexesEnsured = true;
}

export function wereIndexesEnsured(): boolean {
  return indexesEnsured;
}

export async function closeMongo(): Promise<void> {
  if (client && !isServerless) {
    await client.close();
    client = null;
    db = null;
    indexesEnsured = false;
  }
}

export type { Db };
