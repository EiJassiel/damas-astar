import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BattleArena } from '../components/BattleArena';
import { LoadingPanel } from '../components/ScreenShell';
import { useBattlePolling } from '../hooks/useBattlePolling';
import { api, getSession } from '../services/api';

export const Route = createFileRoute('/battle/$code')({
  component: BattlePage
});

function BattlePage() {
  const { code } = Route.useParams();
  const session = getSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const battle = useBattlePolling(code);
  const mutation = useMutation({
    mutationFn: (action: Record<string, unknown>) => api.action(code, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['battle', code] })
  });
  const forfeitMutation = useMutation({
    mutationFn: () => api.forfeitBattle(code, session.playerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['battle', code] });
      await navigate({ to: '/' });
    }
  });

  if (battle.isLoading) {
    return <LoadingPanel title="Cargando..." />;
  }

  if (!battle.data) {
    return <LoadingPanel title="Batalla no encontrada" />;
  }

  return (
    <BattleArena
      battle={battle.data}
      playerId={session.playerId}
      onMove={(moveId) => mutation.mutate({ type: 'move', playerId: session.playerId, moveId, turn: battle.data.turn })}
      onSwitch={(targetIndex) => mutation.mutate({ type: 'switch', playerId: session.playerId, targetIndex, turn: battle.data.turn })}
      onForfeit={() => forfeitMutation.mutate()}
      forfeitPending={forfeitMutation.isPending}
    />
  );
}
