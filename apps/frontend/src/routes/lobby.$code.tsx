import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Copy, Crown, Loader2, MailCheck, Users } from 'lucide-react';
import { useAuthUser } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { ScreenShell } from '../components/ScreenShell';
import { getSession } from '../services/api';
import { useRoomPolling } from '../hooks/useRoomPolling';

export const Route = createFileRoute('/lobby/$code')({
  component: LobbyPage
});

function LobbyPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: room, isLoading } = useRoomPolling(code);
  const { premium: myPremium } = useAuthUser();
  const session = getSession();
  const [copied, setCopied] = useState(false);
  const playerCount = room?.players.length ?? 0;
  const hasPremiumPlayer = room?.players.some((player) => player.premium) ?? myPremium;

  useEffect(() => {
    if (room?.status === 'team_selection' || room?.status === 'ready') {
      navigate({ to: '/team/$code', params: { code } });
    }
    if (room?.status === 'in_battle') {
      navigate({ to: '/battle/$code', params: { code } });
    }
  }, [room?.status, code, navigate]);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <ScreenShell backLabel="Arena">
      <section className={`command-panel command-panel-wide lobby-panel${hasPremiumPlayer ? ' lobby-panel-premium' : ''}`}>
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
          <span className={`lobby-pill${playerCount >= 2 ? ' ready' : ''}`}>
            {playerCount}/2 entrenadores
          </span>
          <span className="lobby-pill waiting">
            {isLoading ? 'Sincronizando' : playerCount >= 2 ? 'Completos' : 'Esperando rival'}
          </span>
        </div>

        <div className="player-list">
          {room?.players.map((player) => {
            const classes = [
              player.playerId === session.playerId ? 'me' : '',
              player.premium ? 'player-premium' : ''
            ].filter(Boolean).join(' ');
            return (
            <article key={player.playerId} className={classes || undefined}>
              <Users size={18} />
              <div className="player-meta">
                <span>{player.name}</span>
                <small className={player.ready ? 'status-ready' : 'status-wait'}>
                  {player.ready ? 'Equipo listo' : 'En lobby'}
                </small>
              </div>
              {player.premium && (
                <span className="player-premium-badge" title="Premium">
                  <Crown size={14} />
                </span>
              )}
              {player.email && (
                <span className="verified-mail" title={player.email}>
                  <MailCheck size={14} />
                </span>
              )}
            </article>
            );
          })}
          {!isLoading && playerCount < 2 && (
            <article className="player-placeholder">
              <Loader2 className="spin" size={18} />
              <div className="player-meta">
                <span>Esperando rival...</span>
                <small className="status-wait">Pendiente</small>
              </div>
            </article>
          )}
        </div>

      </section>
    </ScreenShell>
  );
}
