import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useBattlePolling(code: string) {
  return useQuery({
    queryKey: ['battle', code],
    queryFn: () => api.getBattle(code),
    enabled: Boolean(code),
    refetchInterval: 1000
  });
}
