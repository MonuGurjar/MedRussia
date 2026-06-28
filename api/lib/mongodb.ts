import { MongoClient, Db, Collection } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var __medrussia_mongo_client__: MongoClient | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  // throw lazily in getter to avoid import-time hard crash in non-db routes
}

async function getClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (!global.__medrussia_mongo_client__) {
    global.__medrussia_mongo_client__ = new MongoClient(uri);
    await global.__medrussia_mongo_client__.connect();
  }

  return global.__medrussia_mongo_client__;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB_NAME || 'medrussia';
  return client.db(dbName);
}

export async function getCollection<T = any>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}
