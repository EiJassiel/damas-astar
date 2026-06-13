import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { CheckersGameState } from '../types/checkers';
import { reconcileBattleState } from '../utils/reconcileBattleState';

export function useBattlePolling(code: string, pause = false) {
  return useQuery<CheckersGameState>({
    queryKey: ['battle', code],
    queryFn: () => api.getCheckersGame(code),
    enabled: Boolean(code),
    structuralSharing: (previousData, nextData) =>
      reconcileBattleState(previousData as CheckersGameState | undefined, nextData as CheckersGameState),
    refetchInterval: (query) => {
      if (pause) return false;
      const battle = query.state.data;
      if (!battle) return 1200;
      if (battle.status !== 'active') return false;
      const botTurn = battle.players.some((player) => player.isBot && player.color === battle.turn);
      return botTurn ? 1200 : 4500;
    }
  });
}
