import { findBattle, saveBattle } from '../repositories/battle.repository';
import { findRoom, saveRoom } from '../repositories/room.repository';
import { typeChartByName } from '../repositories/type.repository';
import { resolveTurn } from '../engine/battle-engine';
import { validateAction } from '../engine/validators';
import type { BattleAction, BattleDocument } from '../types/battle.types';
import { AppError, assertFound } from '../utils/errors';
import { sampleSize } from '../utils/random';

export async function getBattle(code: string) {
  return assertFound(await findBattle(code), 'Batalla no encontrada.');
}

export async function submitAction(code: string, action: BattleAction) {
  const battle = assertFound(await findBattle(code), 'Batalla no encontrada.');
  validateAction(battle, action);
  const player = battle.players.find((candidate) => candidate.playerId === action.playerId)!;
  player.selectedAction = action;
  queueBotActionIfNeeded(battle);

  if (battle.players.every((candidate) => candidate.selectedAction)) {
    const typeChart = await typeChartByName();
    resolveTurn(battle, typeChart);
    if (battle.status === 'finished') {
      const room = await findRoom(code);
      if (room) {
        room.status = 'finished';
        await saveRoom(room);
      }
    }
  }

  await saveBattle(battle);
  return battle;
}

export async function forfeitBattle(code: string, playerId: string) {
  const battle = assertFound(await findBattle(code), 'Batalla no encontrada.');
  if (battle.status === 'finished') return battle;

  const player = battle.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new AppError('Jugador no pertenece a la batalla.', 403);

  const winner = battle.players.find((candidate) => candidate.playerId !== playerId);
  const now = new Date();

  player.selectedAction = null;
  player.team.forEach((pokemon) => {
    pokemon.currentHp = 0;
    pokemon.fainted = true;
  });

  battle.status = 'finished';
  battle.winnerPlayerId = winner?.playerId ?? null;
  battle.forfeitedPlayerId = player.playerId;
  battle.penalty = {
    type: 'forfeit',
    playerId: player.playerId,
    reason: 'Derrota automatica por abandonar la partida.',
    appliedAt: now
  };
  battle.battleLog.push(
    {
      turn: battle.turn,
      message: `${player.name} abandona la partida.`,
      createdAt: now,
      meta: { playerId: player.playerId, penalty: 'forfeit' }
    },
    {
      turn: battle.turn,
      message: `${player.name} recibe derrota por abandono.`,
      createdAt: now,
      meta: { playerId: player.playerId, penalty: 'loss' }
    }
  );

  if (winner) {
    battle.battleLog.push({
      turn: battle.turn,
      message: `${winner.name} gana por abandono del rival.`,
      createdAt: now,
      meta: { winnerPlayerId: winner.playerId }
    });
  }

  const room = await findRoom(code);
  if (room) {
    room.status = 'finished';
    await saveRoom(room);
  }

  await saveBattle(battle);
  return battle;
}

function queueBotActionIfNeeded(battle: BattleDocument) {
  const bot = battle.players.find((player) => player.isBot);
  const human = battle.players.find((player) => !player.isBot);
  if (!bot || !human || bot.selectedAction || !human.selectedAction || battle.status !== 'active') return;

  const active = bot.team[bot.activeIndex];
  if (active.fainted || active.currentHp <= 0) {
    const nextIndex = bot.team.findIndex((pokemon, index) => index !== bot.activeIndex && !pokemon.fainted && pokemon.currentHp > 0);
    if (nextIndex >= 0) {
      bot.selectedAction = { type: 'switch', playerId: bot.playerId, targetIndex: nextIndex, turn: battle.turn };
    }
    return;
  }

  const usableMoves = active.moves.filter((move) => move.damageClass !== 'status' || move.ailment || move.statChanges?.length);
  const move = sampleSize(usableMoves.length ? usableMoves : active.moves, 1)[0];
  bot.selectedAction = { type: 'move', playerId: bot.playerId, moveId: move.moveId, turn: battle.turn };
}

export function parseBattleAction(body: any): BattleAction {
  if (!body?.playerId || !body?.type || !body?.turn) throw new AppError('Accion incompleta.');
  if (body.type === 'move') return { type: 'move', playerId: body.playerId, moveId: body.moveId, turn: Number(body.turn) };
  if (body.type === 'switch') return { type: 'switch', playerId: body.playerId, targetIndex: Number(body.targetIndex), turn: Number(body.turn) };
  throw new AppError('Tipo de accion invalido.');
}
