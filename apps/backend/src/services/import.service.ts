import { ObjectId } from 'mongodb';
import { upsertMove } from '../repositories/move.repository';
import { upsertPokemon } from '../repositories/pokemon.repository';
import { upsertType } from '../repositories/type.repository';
import type { DamageClass, MoveDocument, PokemonDocument, TypeDocument } from '../types/pokemon.types';

const POKEAPI = 'https://pokeapi.co/api/v2';
const typeNames = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy'
];

const moveCache = new Map<string, Promise<MoveDocument | null>>();

async function pokeFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${POKEAPI}${path}`);
  if (!res.ok) throw new Error(`PokeAPI ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

const normalize = (name: string) => name.replaceAll('-', ' ');

export async function importPokemon(limit = 300) {
  await importTypes();
  const fetchLimit = limit + 60;
  const list = await pokeFetch<{ results: Array<{ name: string; url: string }> }>(`/pokemon?limit=${fetchLimit}&offset=0`);
  let imported = 0;
  let skipped = 0;

  for (const item of list.results) {
    if (imported >= limit) break;
    const detail = await pokeFetch<any>(`/pokemon/${item.name}`);
    const moveDocs: MoveDocument[] = [];

    for (const ref of detail.moves.slice(0, 120)) {
      if (moveDocs.length >= 16) break;
      const move = await importMove(ref.move.name);
      if (move) moveDocs.push(move);
    }

    const unique = new Map(moveDocs.map((move) => [move.pokeApiId, move]));
    const selected = chooseStoredMoves([...unique.values()]);
    if (selected.length < 4) {
      skipped += 1;
      continue;
    }

    const stats = Object.fromEntries(detail.stats.map((row: any) => [row.stat.name, row.base_stat]));
    const now = new Date();
    const pokemon: PokemonDocument = {
      pokedexId: detail.id,
      name: normalize(detail.name),
      spriteUrl: detail.sprites.front_default ?? detail.sprites.other?.['official-artwork']?.front_default ?? '',
      types: detail.types.map((slot: any) => slot.type.name),
      baseStats: {
        hp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        specialAttack: stats['special-attack'],
        specialDefense: stats['special-defense'],
        speed: stats.speed
      },
      moveIds: selected.map((move) => move._id).filter(Boolean) as ObjectId[],
      createdAt: now,
      updatedAt: now
    };
    await upsertPokemon(pokemon);
    imported += 1;
  }

  return { imported, skipped, requested: limit, scanned: imported + skipped };
}

function chooseStoredMoves(moves: MoveDocument[]) {
  const utility = moves.filter(
    (move) =>
      isSupportedAilment(move.ailment) ||
      move.statChanges?.some((change) => ['attack', 'defense', 'speed'].includes(change.stat) && change.change < 0)
  );
  const damaging = moves
    .filter((move) => move.damageClass !== 'status' && (move.power ?? 0) > 0)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0));
  const selected = [...utility.slice(0, 3), ...damaging.slice(0, 8)];
  const unique = new Map(selected.map((move) => [move.pokeApiId, move]));
  for (const move of moves) {
    if (unique.size >= 8) break;
    unique.set(move.pokeApiId, move);
  }
  return [...unique.values()].slice(0, 8);
}

function isSupportedAilment(ailment?: string | null) {
  return ailment === 'burn' || ailment === 'poison' || ailment === 'paralysis';
}

async function importMove(name: string) {
  if (!moveCache.has(name)) {
    moveCache.set(name, importMoveUncached(name));
  }
  return moveCache.get(name)!;
}

async function importMoveUncached(name: string) {
  const raw = await pokeFetch<any>(`/move/${name}`);
  const damageClass = raw.damage_class?.name as DamageClass | undefined;
  if (!damageClass || !raw.type?.name) return null;
  if ((damageClass === 'physical' || damageClass === 'special') && (!raw.power || raw.power <= 0)) return null;

  const now = new Date();
  const move: MoveDocument = {
    pokeApiId: raw.id,
    name: normalize(raw.name),
    type: raw.type.name,
    power: raw.power ?? null,
    accuracy: raw.accuracy ?? 100,
    priority: raw.priority ?? 0,
    damageClass,
    ailment: raw.meta?.ailment?.name && raw.meta.ailment.name !== 'none' ? raw.meta.ailment.name : null,
    effectChance: raw.effect_chance ?? raw.meta?.ailment_chance ?? raw.meta?.stat_chance ?? null,
    statChanges: raw.stat_changes?.map((change: any) => ({ stat: change.stat.name.replaceAll('-', ''), change: change.change })) ?? [],
    createdAt: now,
    updatedAt: now
  };

  return upsertMove(move);
}

async function importTypes() {
  await Promise.all(
    typeNames.map(async (name) => {
      const raw = await pokeFetch<any>(`/type/${name}`);
      const relations = raw.damage_relations;
      const doc: TypeDocument = {
        name,
        doubleDamageTo: relations.double_damage_to.map((type: any) => type.name),
        halfDamageTo: relations.half_damage_to.map((type: any) => type.name),
        noDamageTo: relations.no_damage_to.map((type: any) => type.name),
        doubleDamageFrom: relations.double_damage_from.map((type: any) => type.name),
        halfDamageFrom: relations.half_damage_from.map((type: any) => type.name),
        noDamageFrom: relations.no_damage_from.map((type: any) => type.name)
      };
      await upsertType(doc);
    })
  );
}
