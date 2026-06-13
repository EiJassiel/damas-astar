import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bot, Copy, Loader2, Play, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ScreenShell } from '../components/ScreenShell';
import { useAuth } from '../context/AuthContext';
import { getSession, api } from '../services/api';
import { useRoomPolling } from '../hooks/useRoomPolling';

export const Route = createFileRoute('/lobby/$code')({
  component: LobbyPage
});

function LobbyPage() {
  const { code } = Route.useParams();
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: room, isLoading } = useRoomPolling(code);
  const session = getSession();
  const [copied, setCopied] = useState(false);
  const startMutation = useMutation({
    mutationFn: () => api.startCheckersGame(code, authUser ? undefined : session.playerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['room', code] });
      await navigate({ to: '/battle/$code', params: { code } });
    }
  });
  const botMutation = useMutation({
    mutationFn: () => api.addCheckersBot(code, 'medium'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', code] })
  });

  useEffect(() => {
    if (room?.status === 'in_game') {
      navigate({ to: '/battle/$code', params: { code } });
    }
  }, [room?.status, code, navigate]);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const playerCount = room?.players.length ?? 0;
  const belongsToRoom = room?.players.some((player) => player.playerId === session.playerId) ?? false;
  const canStart = playerCount === 2 && belongsToRoom;

  return (
    <ScreenShell backLabel="Inicio">
      <section className="command-panel command-panel-wide checkers-lobby">
        <p className="eyebrow">Partida privada</p>
        <div className="room-code-badge" aria-label={`Codigo ${code}`}>
          {code.split('').map((char, index) => (
            <span key={`${char}-${index}`}>{char}</span>
          ))}
        </div>
        <button className={`icon-line copy-button${copied ? ' copied' : ''}`} onClick={copyCode} type="button">
          <Copy size={18} />
          {copied ? 'Copiado' : 'Copiar codigo'}
        </button>

        <div className="lobby-status">
          <span className={`lobby-pill${playerCount >= 2 ? ' ready' : ''}`}>{playerCount}/2 participantes</span>
          <span className="lobby-pill waiting">{isLoading ? 'Sincronizando' : playerCount >= 2 ? 'Listo' : 'Esperando rival'}</span>
        </div>

        <div className="player-list">
          {room?.players.map((player) => (
            <article key={player.playerId} className={player.playerId === session.playerId ? 'me' : undefined}>
              {player.isBot ? <Bot size={18} /> : <Users size={18} />}
              <div className="player-meta">
                <span>{player.name}</span>
                <small className={player.color === 'red' ? 'status-red' : 'status-black'}>
                  {player.color === 'red' ? 'Rojas' : 'Negras'}{player.isBot ? ' · computadora' : ''}
                </small>
              </div>
            </article>
          ))}
          {!isLoading && playerCount < 2 && (
            <article className="player-placeholder">
              <Loader2 className="spin" size={18} />
              <div className="player-meta">
                <span>Comparte el codigo</span>
                <small className="status-wait">Pendiente</small>
              </div>
            </article>
          )}
        </div>

        {!belongsToRoom && room && (
          <p className="form-error">Esta sesion local no pertenece a la sala. Vuelve a entrar con el codigo.</p>
        )}
        {startMutation.error && (
          <p className="form-error">{startMutation.error instanceof Error ? startMutation.error.message : 'No se pudo iniciar la partida.'}</p>
        )}
        {botMutation.error && (
          <p className="form-error">{botMutation.error instanceof Error ? botMutation.error.message : 'No se pudo agregar la computadora.'}</p>
        )}

        {playerCount < 2 && belongsToRoom && (
          <button className="secondary-button panel-submit" disabled={botMutation.isPending} onClick={() => botMutation.mutate()} type="button">
            {botMutation.isPending ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
            Agregar computadora
          </button>
        )}
        <button className="primary-button panel-submit" disabled={!canStart || startMutation.isPending} onClick={() => startMutation.mutate()} type="button">
          {startMutation.isPending ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
          Iniciar partida
        </button>
      </section>
    </ScreenShell>
  );
}
