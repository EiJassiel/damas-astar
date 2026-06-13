import { randomUUID } from 'node:crypto';
import { MongoClient, type Collection, type Db } from 'mongodb';
import type { UserDocument } from '../types/auth.types';
import type { CheckersGameDocument, CheckersRoomDocument, CheckersScoreDocument } from '../types/checkers.types';

let client: MongoClient | null = null;
let database: Db | null = null;
let memoryMode = false;
const memoryCollections = new Map<string, Map<string, any>>();

export async function connectMongo() {
  if (database || memoryMode) return database;

  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/damas';
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 1200 });
  try {
    await client.connect();
    database = client.db();
    await ensureIndexes(database);
  } catch {
    console.warn('Mongo no disponible; usando almacenamiento en memoria para desarrollo local.');
    await client.close().catch(() => undefined);
    client = null;
    memoryMode = true;
  }
  return database;
}

async function ensureIndexes(db: Db) {
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));
  for (const name of ['rooms', 'battles', 'users', 'scores']) {
    if (!existingNames.has(name)) await db.createCollection(name);
  }
  await Promise.all([
    db.collection('rooms').createIndex({ code: 1 }, { unique: true }),
    db.collection('battles').createIndex({ roomCode: 1 }, { unique: true }),
    db.collection('battles').createIndex({ userId: 1 }),
    db.collection('battles').createIndex({ status: 1 }),
    db.collection('users').createIndex({ userId: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('scores').createIndex({ userId: 1 }, { unique: true }),
    db.collection('scores').createIndex({ rating: -1 }),
    db.collection('scores').createIndex({ wins: -1 })
  ]);
}

export const collections = async () => {
  const db = await connectMongo();
  if (!db && memoryMode) {
    return {
      rooms: memoryCollection('rooms') as unknown as Collection<CheckersRoomDocument>,
      battles: memoryCollection('battles') as unknown as Collection<CheckersGameDocument>,
      users: memoryCollection('users') as unknown as Collection<UserDocument>,
      scores: memoryCollection('scores') as unknown as Collection<CheckersScoreDocument>
    };
  }
  if (!db) throw new Error('Base de datos no disponible.');
  return {
    rooms: db.collection<CheckersRoomDocument>('rooms'),
    battles: db.collection<CheckersGameDocument>('battles'),
    users: db.collection<UserDocument>('users'),
    scores: db.collection<CheckersScoreDocument>('scores')
  };
};

export async function closeMongo() {
  await client?.close();
  client = null;
  database = null;
  memoryMode = false;
  memoryCollections.clear();
}

function memoryCollection(name: string) {
  if (!memoryCollections.has(name)) memoryCollections.set(name, new Map());
  const store = memoryCollections.get(name)!;
  return {
    async insertOne(document: any) {
      const key = documentKey(document);
      if (store.has(key)) throw new Error(`Duplicate key ${key}`);
      store.set(key, structuredClone(document));
      return { acknowledged: true, insertedId: key };
    },
    async findOne(query: Record<string, unknown>) {
      for (const document of store.values()) {
        if (matchesQuery(document, query)) return structuredClone(document);
      }
      return null;
    },
    async replaceOne(query: Record<string, unknown>, document: any, options?: { upsert?: boolean }) {
      const existing = await this.findOne(query);
      if (!existing && !options?.upsert) return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
      const key = existing ? documentKey(existing) : documentKey(document);
      store.set(key, structuredClone(document));
      return { acknowledged: true, matchedCount: existing ? 1 : 0, modifiedCount: 1, upsertedId: existing ? null : key };
    },
    async deleteOne(query: Record<string, unknown>) {
      for (const [key, document] of store.entries()) {
        if (matchesQuery(document, query)) {
          store.delete(key);
          return { acknowledged: true, deletedCount: 1 };
        }
      }
      return { acknowledged: true, deletedCount: 0 };
    },
    find(query: Record<string, unknown> = {}) {
      const rows = Array.from(store.values())
        .filter((document) => matchesQuery(document, query))
        .map((document) => structuredClone(document));
      return {
        sort(sortBy: Record<string, 1 | -1>) {
          const [[field, direction]] = Object.entries(sortBy);
          rows.sort((a, b) => {
            const left = a?.[field] ?? 0;
            const right = b?.[field] ?? 0;
            if (left === right) return 0;
            return left > right ? direction : -direction;
          });
          return this;
        },
        limit(n: number) {
          return {
            async toArray() {
              return rows.slice(0, n);
            }
          };
        },
        async toArray() {
          return rows;
        }
      };
    },
    async updateOne() {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
    },
    async createIndex() {
      return `${name}_memory_index`;
    }
  };
}

function documentKey(document: any) {
  return String(
    document.userId ?? document.roomCode ?? document.code ?? document.email ?? document._id ?? randomUUID()
  ).toUpperCase();
}

function matchesQuery(document: any, query: Record<string, unknown>) {
  return Object.entries(query).every(([key, value]) => {
    const left = document[key];
    if (value instanceof Date && left instanceof Date) return value.getTime() === left.getTime();
    return String(left ?? '').toUpperCase() === String(value ?? '').toUpperCase();
  });
}
