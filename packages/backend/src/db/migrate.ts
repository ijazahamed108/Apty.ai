import type { Db } from 'mongodb';
import { COLLECTIONS } from './collections.js';

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection(COLLECTIONS.users).createIndexes([
    { key: { email: 1 }, unique: true, name: 'users_email_unique' },
    { key: { role: 1 }, name: 'users_role' },
  ]);

  await db.collection(COLLECTIONS.walkthroughs).createIndexes([
    {
      key: { userId: 1, origin: 1, pathPattern: 1 },
      name: 'walkthroughs_user_origin_path',
    },
    { key: { updatedAt: -1 }, name: 'walkthroughs_updated_at' },
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { connectMongo, closeMongo } = await import('./mongo.js');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');

  const db = await connectMongo(uri);
  await ensureIndexes(db);
  await closeMongo();
  console.log('MongoDB indexes ensured');
}
