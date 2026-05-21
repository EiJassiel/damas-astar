import type { BattleLogEntry, BattleMove, BattlePokemon, StatusType } from '../types/battle.types';
import { randomInt } from '../utils/random';

const ailmentMap: Record<string, StatusType | undefined> = {
  burn: 'burn',
  poison: 'poison',
  paralysis: 'paralysis'
};

const statMap: Record<string, StatusType | undefined> = {
  attack: 'attackDown',
  defense: 'defenseDown',
  speed: 'speedDown'
};

export function maybeApplyMoveEffect(target: BattlePokemon, move: BattleMove, logs: BattleLogEntry[], turn: number) {
  const statusFromAilment = move.ailment ? ailmentMap[move.ailment] : undefined;
  const chance = statusFromAilment ? 100 : move.effectChance ?? (move.damageClass === 'status' ? 100 : 20);
  if (statusFromAilment && !target.status && randomInt(1, 100) <= chance) {
    target.status = { type: statusFromAilment, remainingTurns: 3 };
    logs.push({ turn, message: `${target.name} queda afectado por ${statusFromAilment}.`, createdAt: new Date() });
  }

  for (const change of move.statChanges ?? []) {
    if (change.change >= 0) continue;
    const mapped = statMap[change.stat];
    const stageKey = change.stat as keyof typeof target.statStages;
    if (stageKey in target.statStages && randomInt(1, 100) <= chance) {
      target.statStages[stageKey] = Math.max(-6, target.statStages[stageKey] + change.change);
      if (!target.status && mapped) target.status = { type: mapped, remainingTurns: 3 };
      logs.push({ turn, message: `${target.name} pierde ${change.stat}.`, createdAt: new Date() });
    }
  }
}

export function applyPassiveStatus(pokemon: BattlePokemon, logs: BattleLogEntry[], turn: number) {
  if (!pokemon.status || pokemon.fainted) return;

  if (pokemon.status.type === 'burn' || pokemon.status.type === 'poison') {
    const damage = Math.max(1, Math.floor(pokemon.battleStats.maxHp * 0.05));
    pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
    logs.push({ turn, message: `${pokemon.name} sufre ${damage} de dano por ${pokemon.status.type}.`, createdAt: new Date() });
  }

  pokemon.status.remainingTurns -= 1;
  if (pokemon.currentHp <= 0) {
    pokemon.fainted = true;
    logs.push({ turn, message: `${pokemon.name} se debilito.`, createdAt: new Date() });
  }
  if (pokemon.status.remainingTurns <= 0) {
    logs.push({ turn, message: `${pokemon.name} se recupera de ${pokemon.status.type}.`, createdAt: new Date() });
    pokemon.status = null;
  }
}

export function isFullyParalyzed(pokemon: BattlePokemon) {
  return pokemon.status?.type === 'paralysis' && randomInt(1, 100) <= 25;
}
