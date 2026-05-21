import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useRoomPolling(code: string) {
  return useQuery({
    queryKey: ['room', code],
    queryFn: () => api.getRoom(code),
    enabled: Boolean(code),
    refetchInterval: 1000
  });
}
