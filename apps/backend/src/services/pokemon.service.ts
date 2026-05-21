import { findMovesByIds } from '../repositories/move.repository';
import { listPokemon, findPokemonById } from '../repositories/pokemon.repository';
import { assertFound } from '../utils/errors';
import type { MoveDocument, PokemonDocument } from '../types/pokemon.types';

export async function getPokemonCatalog(params: { search?: string; type?: string; page?: string; limit?: string }) {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(60, Math.max(1, Number(params.limit ?? 24)));
  const result = await listPokemon({ search: params.search, type: params.type, page, limit });
  const items = await Promise.all(result.items.map(toPokemonApi));
  return {
    ...result,
    page,
    limit,
    items
  };
}

export async function getPokemon(id: string) {
  const pokemon = assertFound(await findPokemonById(id), 'Pokemon no encontrado.');
  return toPokemonApi(pokemon);
}

async function toPokemonApi(pokemon: PokemonDocument) {
  const moves = await findMovesByIds(pokemon.moveIds);
  return {
    ...pokemon,
    id: pokemon._id?.toString(),
    moveIds: pokemon.moveIds.map((moveId) => moveId.toString()),
    moves: choosePreviewMoves(moves).map((move) => ({
      moveId: move._id!.toString(),
      name: move.name,
      type: move.type,
      power: move.power,
      accuracy: move.accuracy,
      priority: move.priority,
      damageClass: move.damageClass,
      ailment: move.ailment,
      effectChance: move.effectChance,
      statChanges: move.statChanges
    }))
  };
}

function choosePreviewMoves(moves: MoveDocument[]) {
  const utility = moves.filter(hasBattleEffect);
  const damaging = moves
    .filter((move) => move.damageClass !== 'status' && (move.power ?? 0) > 0)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0));

  const chosen = [...utility.slice(0, 1), ...damaging].filter(Boolean);
  const unique = new Map(chosen.map((move) => [move._id!.toString(), move]));
  for (const move of moves) {
    if (unique.size >= 4) break;
    unique.set(move._id!.toString(), move);
  }
  return [...unique.values()].slice(0, 4);
}

function hasBattleEffect(move: MoveDocument) {
  return Boolean(
    isSupportedAilment(move.ailment) ||
      move.statChanges?.some((change) => ['attack', 'defense', 'speed'].includes(change.stat) && change.change < 0)
  );
}

function isSupportedAilment(ailment?: string | null) {
  return ailment === 'burn' || ailment === 'poison' || ailment === 'paralysis';
}
