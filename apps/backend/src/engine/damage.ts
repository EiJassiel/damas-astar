import type { BattleMove, BattlePokemon } from '../types/battle.types';
import { randomInt } from '../utils/random';
import { getEffectiveStat } from './stats';
import { getTypeMultiplier, type TypeChart } from './type-effectiveness';

export type DamageResult = {
  damage: number;
  typeMultiplier: number;
  critical: boolean;
  hit: boolean;
};

export function calculateDamage(attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove, typeChart: TypeChart): DamageResult {
  const accuracy = move.accuracy ?? 100;
  const hit = randomInt(1, 100) <= accuracy;
  if (!hit) return { damage: 0, typeMultiplier: 1, critical: false, hit };

  if (move.damageClass === 'status' || !move.power) {
    return { damage: 0, typeMultiplier: 1, critical: false, hit };
  }

  const attackStat = move.damageClass === 'physical'
    ? getEffectiveStat(attacker, 'attack')
    : getEffectiveStat(attacker, 'specialAttack');
  const defenseStat = move.damageClass === 'physical'
    ? getEffectiveStat(defender, 'defense')
    : getEffectiveStat(defender, 'specialDefense');

  const baseDamage =
    Math.floor(
      Math.floor(Math.floor((2 * attacker.level) / 5 + 2) * move.power * attackStat / defenseStat) / 50
    ) + 2;

  const typeMultiplier = getTypeMultiplier(move.type, defender.types, typeChart);
  if (typeMultiplier === 0) return { damage: 0, typeMultiplier, critical: false, hit };

  const randomFactor = randomInt(85, 100) / 100;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const critical = Math.random() < 1 / 24;
  const burnModifier = attacker.status?.type === 'burn' && move.damageClass === 'physical' ? 0.5 : 1;
  const modifier = randomFactor * stab * typeMultiplier * (critical ? 1.5 : 1) * burnModifier;

  return {
    damage: Math.max(1, Math.floor(baseDamage * modifier)),
    typeMultiplier,
    critical,
    hit
  };
}
