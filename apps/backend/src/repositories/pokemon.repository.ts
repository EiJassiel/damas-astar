import { ObjectId } from 'mongodb';
import { collections } from '../db/mongo';
import type { PokemonDocument } from '../types/pokemon.types';

export async function upsertPokemon(pokemon: PokemonDocument) {
  const { pokemons } = await collections();
  const { createdAt, ...update } = pokemon;
  await pokemons.updateOne(
    { pokedexId: pokemon.pokedexId },
    { $set: { ...update, updatedAt: new Date() }, $setOnInsert: { createdAt } },
    { upsert: true }
  );
  return pokemons.findOne({ pokedexId: pokemon.pokedexId });
}

export async function listPokemon(params: { search?: string; type?: string; page: number; limit: number }) {
  const { pokemons } = await collections();
  const filter: Record<string, unknown> = {};
  if (params.search) filter.name = { $regex: params.search, $options: 'i' };
  if (params.type) filter.types = params.type;

  const [items, total] = await Promise.all([
    pokemons
      .find(filter)
      .sort({ pokedexId: 1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .toArray(),
    pokemons.countDocuments(filter)
  ]);
  return { items, total };
}

export async function findPokemonById(id: string) {
  const { pokemons } = await collections();
  return pokemons.findOne({ _id: new ObjectId(id) });
}

export async function findPokemonByIds(ids: string[]) {
  const { pokemons } = await collections();
  return pokemons.find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }).toArray();
}

export async function countPokemon() {
  const { pokemons } = await collections();
  return pokemons.countDocuments();
}
