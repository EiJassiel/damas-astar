import { randomUUID } from 'node:crypto';
import { findBattle, saveBattle } from '../repositories/battle.repository';
import { findMovesByIds } from '../repositories/move.repository';
import { findPokemonByIds, listPokemon } from '../repositories/pokemon.repository';
import { createRoom, findRoom, saveRoom } from '../repositories/room.repository';
import type { BattleDocument, BattleMove, BattlePokemon, RoomDocument } from '../types/battle.types';
import type { MoveDocument, PokemonDocument } from '../types/pokemon.types';
import { AppError, assertFound } from '../utils/errors';
import { createRoomCode } from '../utils/code';
import { sampleSize } from '../utils/random';
import { buildBattleStats, LEVEL, randomIvs, zeroStatStages } from '../engine/stats';

export async function createBattleRoom(playerName: string, playerEmail: string) {
  let code = createRoomCode();
  while (await findRoom(code)) code = createRoomCode();
  const playerId = randomUUID();
  const now = new Date();
  const room: RoomDocument = {
    code,
    status: 'waiting',
    players: [{ playerId, name: playerName.trim(), email: playerEmail, joinedAt: now, ready: false, teamPokemonIds: [] }],
    createdAt: now,
    updatedAt: now
  };
  await createRoom(room);
  return { code, playerId };
}

export async function createSoloBattleRoom(playerName: string, playerEmail: string) {
  let code = createRoomCode();
  while (await findRoom(code)) code = createRoomCode();

  const catalog = await listPokemon({ page: 1, limit: 80 });
  const eligible = catalog.items.filter((pokemon) => pokemon.moveIds.length >= 4);
  if (eligible.length < 12) throw new AppError('Importa Pokemon antes de iniciar modo solitario.', 409);

  const humanTeam = sampleSize(eligible, 6);
  const botTeam = sampleSize(eligible, 6);
  const playerId = randomUUID();
  const botId = `bot-${randomUUID()}`;
  const now = new Date();

  const room: RoomDocument = {
    code,
    status: 'in_battle',
    players: [
      {
        playerId,
        name: playerName.trim(),
        email: playerEmail,
        joinedAt: now,
        ready: true,
        teamPokemonIds: humanTeam.map((pokemon) => pokemon._id!.toString())
      },
      {
        playerId: botId,
        name: 'Professor Bot',
        email: 'bot@pokemon.local',
        joinedAt: now,
        ready: true,
        teamPokemonIds: botTeam.map((pokemon) => pokemon._id!.toString()),
        isBot: true
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  const battle: BattleDocument = {
    roomCode: code,
    status: 'active',
    turn: 1,
    players: [
      {
        playerId,
        name: room.players[0].name,
        email: room.players[0].email,
        team: await Promise.all(humanTeam.map(buildBattlePokemon)),
        activeIndex: 0,
        selectedAction: null
      },
      {
        playerId: botId,
        name: 'Professor Bot',
        email: 'bot@pokemon.local',
        team: await Promise.all(botTeam.map(buildBattlePokemon)),
        activeIndex: 0,
        selectedAction: null,
        isBot: true
      }
    ],
    battleLog: [{ turn: 1, message: 'Modo solitario iniciado. Professor Bot acepta el desafio.', createdAt: now }],
    winnerPlayerId: null,
    createdAt: now,
    updatedAt: now
  };

  await createRoom(room);
  await saveBattle(battle);
  return { code, playerId };
}

export async function joinBattleRoom(code: string, playerName: string, playerEmail: string) {
  const room = assertFound(await findRoom(code), 'Sala no encontrada.');
  if (room.players.length >= 2) throw new AppError('La sala ya tiene dos jugadores.', 409);
  const playerId = randomUUID();
  if (room.players.some((player) => player.email === playerEmail)) throw new AppError('Ese correo ya esta dentro de la sala.', 409);
  room.players.push({ playerId, name: playerName.trim(), email: playerEmail, joinedAt: new Date(), ready: false, teamPokemonIds: [] });
  room.status = 'team_selection';
  await saveRoom(room);
  return { code: room.code, playerId };
}

export async function getRoom(code: string) {
  return assertFound(await findRoom(code), 'Sala no encontrada.');
}

export async function setTeam(code: string, playerId: string, pokemonIds: string[]) {
  const room = assertFound(await findRoom(code), 'Sala no encontrada.');
  const player = room.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new AppError('Jugador no pertenece a la sala.', 403);
  if (pokemonIds.length < 1 || pokemonIds.length > 6) throw new AppError('El equipo debe tener entre 1 y 6 Pokemon.');

  const pokemons = await findPokemonByIds(pokemonIds);
  if (pokemons.length !== pokemonIds.length) throw new AppError('Uno o mas Pokemon no existen.');
  if (pokemons.some((pokemon) => pokemon.moveIds.length < 4)) throw new AppError('Todos los Pokemon necesitan al menos 4 movimientos.');

  player.teamPokemonIds = pokemonIds;
  player.ready = true;
  if (room.players.length === 2 && room.players.every((candidate) => candidate.ready)) room.status = 'ready';
  await saveRoom(room);
  return room;
}

export async function startRoomBattle(code: string, playerId: string) {
  const room = assertFound(await findRoom(code), 'Sala no encontrada.');
  if (!room.players.some((player) => player.playerId === playerId)) throw new AppError('Jugador no pertenece a la sala.', 403);
  if (room.players.length !== 2) throw new AppError('Se necesitan dos jugadores para iniciar.', 409);
  if (!room.players.every((player) => player.teamPokemonIds.length > 0)) throw new AppError('Ambos jugadores necesitan equipo.', 409);

  const existing = await findBattle(room.code);
  if (existing) return existing;

  const players = [];
  for (const player of room.players) {
    const pokemons = await findPokemonByIds(player.teamPokemonIds);
      players.push({
        playerId: player.playerId,
        name: player.name,
        email: player.email,
        team: await Promise.all(pokemons.map(buildBattlePokemon)),
      activeIndex: 0,
      selectedAction: null,
      isBot: player.isBot
    });
  }

  const now = new Date();
  const battle: BattleDocument = {
    roomCode: room.code,
    status: 'active',
    turn: 1,
    players,
    battleLog: [{ turn: 1, message: 'La batalla comienza.', createdAt: now }],
    winnerPlayerId: null,
    createdAt: now,
    updatedAt: now
  };

  room.status = 'in_battle';
  await saveRoom(room);
  await saveBattle(battle);
  return battle;
}

async function buildBattlePokemon(pokemon: PokemonDocument): Promise<BattlePokemon> {
  const moves = await findMovesByIds(pokemon.moveIds);
  const selected = chooseBattleMoves(moves).map(toBattleMove);
  const ivs = randomIvs();
  const battleStats = buildBattleStats(pokemon.baseStats, ivs);
  return {
    pokemonId: pokemon._id!.toString(),
    pokedexId: pokemon.pokedexId,
    name: pokemon.name,
    spriteUrl: pokemon.spriteUrl,
    types: pokemon.types,
    level: LEVEL,
    ivs,
    baseStats: pokemon.baseStats,
    battleStats,
    currentHp: battleStats.maxHp,
    moves: selected,
    status: null,
    statStages: zeroStatStages(),
    fainted: false
  };
}

function chooseBattleMoves(moves: MoveDocument[]) {
  const utility = moves.filter(hasBattleEffect);
  const damaging = moves
    .filter((move) => move.damageClass !== 'status' && (move.power ?? 0) > 0)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0));
  const coverage = sampleSize(damaging, Math.min(3, damaging.length));
  const chosen = [...sampleSize(utility, Math.min(1, utility.length)), ...coverage];
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

function toBattleMove(move: MoveDocument): BattleMove {
  return {
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
  };
}
