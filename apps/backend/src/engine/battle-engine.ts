import type { BattleAction, BattleDocument, BattleLogEntry, BattlePlayer } from '../types/battle.types';
import { calculateDamage } from './damage';
import { applyPassiveStatus, isFullyParalyzed, maybeApplyMoveEffect } from './status';
import { resetStatStages } from './stats';
import { effectivenessMessage, type TypeChart } from './type-effectiveness';
import { orderActions } from './turn-order';
import { validateAction } from './validators';

export function hasLost(player: BattlePlayer) {
  return player.team.every((pokemon) => pokemon.fainted || pokemon.currentHp <= 0);
}

export function resolveTurn(battle: BattleDocument, typeChart: TypeChart): BattleDocument {
  const actions = battle.players.map((player) => player.selectedAction).filter(Boolean) as BattleAction[];
  if (actions.length < 2) return battle;
  for (const action of actions) validateAction({ ...battle, players: battle.players.map((p) => ({ ...p, selectedAction: null })) }, action);

  const turnLogs: BattleLogEntry[] = [];
  const entries = battle.players.map((player) => {
    const opponent = battle.players.find((candidate) => candidate.playerId !== player.playerId)!;
    const action = player.selectedAction!;
    const active = player.team[player.activeIndex];
    const move = action.type === 'move' ? active.moves.find((candidate) => candidate.moveId === action.moveId) : undefined;
    return { player, opponent, action, move };
  });

  for (const entry of orderActions(entries)) {
    if (battle.status === 'finished') break;

    const active = entry.player.team[entry.player.activeIndex];

    if (entry.action.type === 'switch') {
      active.status = null;
      resetStatStages(active);
      entry.player.activeIndex = entry.action.targetIndex;
      turnLogs.push({ turn: battle.turn, message: `${entry.player.name} cambia a ${entry.player.team[entry.player.activeIndex].name}.`, createdAt: new Date() });
      continue;
    }

    if (active.fainted || active.currentHp <= 0) continue;

    const defender = entry.opponent.team[entry.opponent.activeIndex];
    if (!entry.move || defender.fainted) continue;

    if (isFullyParalyzed(active)) {
      turnLogs.push({ turn: battle.turn, message: `${active.name} esta paralizado y no puede moverse.`, createdAt: new Date() });
      continue;
    }

    const result = calculateDamage(active, defender, entry.move, typeChart);
    if (!result.hit) {
      turnLogs.push({ turn: battle.turn, message: `${active.name} usa ${entry.move.name}, pero falla.`, createdAt: new Date() });
      continue;
    }

    defender.currentHp = Math.max(0, defender.currentHp - result.damage);
    turnLogs.push({
      turn: battle.turn,
      message: `${active.name} usa ${entry.move.name} y causa ${result.damage} de dano a ${defender.name}.`,
      createdAt: new Date(),
      meta: { damage: result.damage, attackerId: active.pokemonId, defenderId: defender.pokemonId, moveType: entry.move.type }
    });
    const msg = effectivenessMessage(result.typeMultiplier);
    if (msg) turnLogs.push({ turn: battle.turn, message: msg, createdAt: new Date(), meta: { typeMultiplier: result.typeMultiplier } });
    if (result.critical) turnLogs.push({ turn: battle.turn, message: 'Golpe critico.', createdAt: new Date() });

    if (defender.currentHp <= 0) {
      defender.fainted = true;
      turnLogs.push({ turn: battle.turn, message: `${defender.name} se debilito.`, createdAt: new Date() });
    } else {
      maybeApplyMoveEffect(defender, entry.move, turnLogs, battle.turn);
    }

    finishIfNeeded(battle, turnLogs);
  }

  if (battle.status !== 'finished') {
    for (const player of battle.players) {
      applyPassiveStatus(player.team[player.activeIndex], turnLogs, battle.turn);
    }
    finishIfNeeded(battle, turnLogs);
  }

  battle.battleLog.push(...turnLogs);
  for (const player of battle.players) player.selectedAction = null;
  if (battle.status !== 'finished') battle.turn += 1;
  return battle;
}

function finishIfNeeded(battle: BattleDocument, logs: BattleLogEntry[]) {
  const loser = battle.players.find(hasLost);
  if (!loser) return;
  const winner = battle.players.find((player) => player.playerId !== loser.playerId)!;
  battle.status = 'finished';
  battle.winnerPlayerId = winner.playerId;
  logs.push({ turn: battle.turn, message: `${winner.name} gana la batalla.`, createdAt: new Date(), meta: { winnerPlayerId: winner.playerId } });
}
