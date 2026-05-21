import { MongoClient, type Collection, type Db } from 'mongodb';
import type { BattleDocument, RoomDocument } from '../types/battle.types';
import type { UserDocument } from '../types/auth.types';
import type { MoveDocument, PokemonDocument, TypeDocument } from '../types/pokemon.types';

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectMongo() {
  if (database) return database;

  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/pokemon_battle_rooms';
  client = new MongoClient(uri);
  await client.connect();
  database = client.db();
  await ensureIndexes(database);
  return database;
}

async function ensureIndexes(db: Db) {
  // Ensure collections exist before querying indexes
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  for (const name of ['pokemons', 'moves', 'types', 'rooms', 'battles', 'users']) {
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
  }

  // Drop conflicting text indexes on pokemons before recreating
  try {
    const pokemonIndexes = await db.collection('pokemons').indexes();
    for (const index of pokemonIndexes) {
      const isTextIndex = index.key?.name === 'text' || index.key?._fts === 'text';
      if (isTextIndex && index.name && index.name !== 'name_text') {
        await db.collection('pokemons').dropIndex(index.name);
      }
    }
  } catch {
    // collection may be empty — safe to ignore
  }

  await Promise.all([
    db.collection('pokemons').createIndex({ pokedexId: 1 }, { unique: true }),
    db.collection('pokemons').createIndex({ name: 'text' }),
    db.collection('pokemons').createIndex({ types: 1 }),
    db.collection('moves').createIndex({ pokeApiId: 1 }, { unique: true }),
    db.collection('moves').createIndex({ name: 1 }),
    db.collection('types').createIndex({ name: 1 }, { unique: true }),
    db.collection('rooms').createIndex({ code: 1 }, { unique: true }),
    db.collection('battles').createIndex({ roomCode: 1 }, { unique: true }),
    db.collection('users').createIndex({ googleId: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true })
  ]);
}

export const collections = async () => {
  const db = await connectMongo();
  return {
    pokemons: db.collection<PokemonDocument>('pokemons') as Collection<PokemonDocument>,
    moves: db.collection<MoveDocument>('moves') as Collection<MoveDocument>,
    types: db.collection<TypeDocument>('types') as Collection<TypeDocument>,
    rooms: db.collection<RoomDocument>('rooms') as Collection<RoomDocument>,
    battles: db.collection<BattleDocument>('battles') as Collection<BattleDocument>,
    users: db.collection<UserDocument>('users') as Collection<UserDocument>
  };
};

export async function closeMongo() {
  await client?.close();
  client = null;
  database = null;
}
