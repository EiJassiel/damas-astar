import type { TypeDocument } from '../types/pokemon.types';

export type TypeChart = Record<string, TypeDocument>;

export function getSingleMultiplier(attackType: string, defenderType: string, typeChart: TypeChart) {
  const relation = typeChart[attackType];
  if (!relation) return 1;
  if (relation.noDamageTo.includes(defenderType)) return 0;
  if (relation.doubleDamageTo.includes(defenderType)) return 2;
  if (relation.halfDamageTo.includes(defenderType)) return 0.5;
  return 1;
}

export function getTypeMultiplier(moveType: string, defenderTypes: string[], typeChart: TypeChart) {
  return defenderTypes.reduce((mult, defenderType) => mult * getSingleMultiplier(moveType, defenderType, typeChart), 1);
}

export function effectivenessMessage(multiplier: number) {
  if (multiplier === 0) return "It had no effect.";
  if (multiplier >= 2) return "It's super effective!";
  if (multiplier > 0 && multiplier < 1) return "It's not very effective\u2026";
  return null;
}
