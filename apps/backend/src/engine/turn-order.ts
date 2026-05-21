import type { BattleAction, BattleMove, BattlePlayer } from '../types/battle.types';
import { coinFlip } from '../utils/random';
import { getEffectiveStat } from './stats';

export function getActionPriority(action: BattleAction, move?: BattleMove) {
  if (action.type === 'switch') return 6;
  return move?.priority ?? 0;
}

export function orderActions(
  entries: Array<{ player: BattlePlayer; opponent: BattlePlayer; action: BattleAction; move?: BattleMove }>
) {
  return entries.sort((a, b) => {
    const priority = getActionPriority(b.action, b.move) - getActionPriority(a.action, a.move);
    if (priority !== 0) return priority;
    const speedA = getEffectiveStat(a.player.team[a.player.activeIndex], 'speed');
    const speedB = getEffectiveStat(b.player.team[b.player.activeIndex], 'speed');
    if (speedA !== speedB) return speedB - speedA;
    return coinFlip() ? -1 : 1;
  });
}
