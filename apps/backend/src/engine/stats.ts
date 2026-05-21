import type { BattlePokemon } from '../types/battle.types';
import type { BaseStats } from '../types/pokemon.types';
import { randomInt } from '../utils/random';

export const LEVEL = 50;

export const zeroStatStages = () => ({
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0
});

export const randomIvs = (): BaseStats => ({
  hp: randomInt(0, 31),
  attack: randomInt(0, 31),
  defense: randomInt(0, 31),
  specialAttack: randomInt(0, 31),
  specialDefense: randomInt(0, 31),
  speed: randomInt(0, 31)
});

export function buildBattleStats(baseStats: BaseStats, ivs: BaseStats) {
  const maxHp = Math.floor(((2 * baseStats.hp + ivs.hp) * LEVEL) / 100) + LEVEL + 10;
  const stat = (key: keyof Omit<BaseStats, 'hp'>) =>
    Math.floor(((2 * baseStats[key] + ivs[key]) * LEVEL) / 100) + 5;

  return {
    maxHp,
    hp: maxHp,
    attack: stat('attack'),
    defense: stat('defense'),
    specialAttack: stat('specialAttack'),
    specialDefense: stat('specialDefense'),
    speed: stat('speed')
  };
}

export function getStageMultiplier(stage: number) {
  const clamped = Math.max(-6, Math.min(6, stage));
  return clamped >= 0 ? (2 + clamped) / 2 : 2 / (2 - clamped);
}

export function getEffectiveStat(pokemon: BattlePokemon, stat: keyof Omit<BaseStats, 'hp'>) {
  const staged = Math.floor(pokemon.battleStats[stat] * getStageMultiplier(pokemon.statStages[stat]));
  if (stat === 'speed' && pokemon.status?.type === 'paralysis') return Math.max(1, Math.floor(staged / 2));
  return Math.max(1, staged);
}

export function resetStatStages(pokemon: BattlePokemon) {
  pokemon.statStages = zeroStatStages();
}
