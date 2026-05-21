import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Copy, MailCheck, Users } from 'lucide-react';
import { useEffect } from 'react';
import { getSession } from '../services/api';
import { useRoomPolling } from '../hooks/useRoomPolling';

export const Route = createFileRoute('/lobby/$code')({
  component: LobbyPage
});

function LobbyPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: room, isLoading } = useRoomPolling(code);
  const session = getSession();

  useEffect(() => {
    if (room?.status === 'team_selection' || room?.status === 'ready') {
      navigate({ to: '/team/$code', params: { code } });
    }
    if (room?.status === 'in_battle') {
      navigate({ to: '/battle/$code', params: { code } });
    }
  }, [room?.status, code, navigate]);

  return (
    <main className="form-screen">
      <section className="command-panel lobby">
        <p className="eyebrow">Lobby</p>
        <h1>{code}</h1>
        <button className="icon-line" onClick={() => navigator.clipboard.writeText(code)} type="button"><Copy size={18} />Copiar codigo</button>
        <div className="player-list">
          {room?.players.map((player) => (
            <article key={player.playerId} className={player.playerId === session.playerId ? 'me' : ''}>
              <Users size={18} />
              <span>{player.name}</span>
              <small>{player.ready ? 'equipo listo' : 'en lobby'}</small>
              {player.email && (
                <span className="verified-mail" title={player.email}>
                  <MailCheck size={14} />
                  Gmail verificado
                </span>
              )}
            </article>
          ))}
        </div>
        <p className="muted">{isLoading ? 'Buscando sala...' : 'Esperando al segundo jugador.'}</p>
      </section>
    </main>
  );
}
