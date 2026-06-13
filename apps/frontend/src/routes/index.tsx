import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Bot, ChevronRight, Play, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { LeaderboardEntry, SavedGameSummary } from '../types/checkers';

export const Route = createFileRoute('/')({
  component: HomePage
});

function HomePage() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myGames, setMyGames] = useState<SavedGameSummary[]>([]);
  const [sort, setSort] = useState<'wins' | 'winRate'>('wins');

  useEffect(() => {
    api.getCheckersLeaderboard(8, sort).then(setLeaderboard).catch(() => undefined);
  }, [sort]);

  useEffect(() => {
    if (!authUser) {
      setMyGames([]);
      return;
    }
    api.listMyGames().then(setMyGames).catch(() => undefined);
  }, [authUser]);

  const activeGames = myGames.filter((game) => game.status === 'active');
  const heroActiveGames = activeGames.slice(0, 2);
  const moreActiveGames = activeGames.slice(2);
  const recentGames = myGames.filter((game) => game.status !== 'active').slice(0, 5);
  const displayName = authUser?.name ?? 'Invitado';

  return (
    <main className="home-dashboard">
      <aside className="home-rail" aria-label="Marca">
        <div className="home-rail-brand">
          <div className="brand-logo">8x8</div>
          <div>
            <h2>Damas</h2>
            <p>Contra computadora</p>
          </div>
        </div>
        <div className="home-rail-meta">
          <span className="home-rail-chip">
            <Bot size={14} />
            contra computadora
          </span>
        </div>
      </aside>

      <div className="home-content">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-intro">
            <p className="eyebrow">Tablero 8x8 · Damas clasicas</p>
            <h1 id="home-title">Hola, {displayName}</h1>
            <p className="home-hero-lead">
              {authUser
                ? 'Retoma una partida guardada o inicia un nuevo duelo de damas.'
                : 'Juega al instante. Si quieres guardar partidas y subir en el ranking, crea una cuenta.'}
            </p>
          </div>

          {authUser && heroActiveGames.length > 0 && (
            <div className="home-resume">
              <p className="home-resume-label">Continuar</p>
              {heroActiveGames.map((game) => (
                <button
                  key={game.roomCode}
                  className="home-resume-card"
                  onClick={() => navigate({ to: '/battle/$code', params: { code: game.roomCode } })}
                  type="button"
                >
                  <span className="home-resume-icon">
                    <Play size={18} />
                  </span>
                  <span className="home-resume-copy">
                    <strong>Partida {game.roomCode}</strong>
                    <small>Turno {game.turnNumber} · {game.botDifficulty ?? 'medium'}</small>
                  </span>
                  <ChevronRight size={18} className="home-resume-arrow" />
                </button>
              ))}
            </div>
          )}

          <div className="home-hero-play">
            <Link className="home-play-cta" to="/create-room">
              <Bot size={20} />
              Nueva partida
            </Link>
          </div>
        </section>

        <section className="home-panels" aria-label="Actividad y ranking">
          <article className="home-panel">
            <header className="home-panel-head">
              <h2>{authUser ? 'Tu actividad' : 'Partidas guardadas'}</h2>
            </header>

            {!authUser ? (
              <div className="home-panel-empty">
                <p>Las partidas de invitado no se guardan en el servidor.</p>
                <p className="home-panel-hint">
                  Crea una cuenta para historial, ranking y tableros.{' '}
                  <Link to="/login">Entrar</Link>
                </p>
              </div>
            ) : (
              <>
                {moreActiveGames.length === 0 && recentGames.length === 0 && heroActiveGames.length === 0 ? (
                  <div className="home-panel-empty">
                    <p>Aun no tienes partidas registradas.</p>
                    <p className="home-panel-hint">Tu primera partida contra la IA aparecera aqui.</p>
                  </div>
                ) : moreActiveGames.length === 0 && recentGames.length === 0 ? (
                  <div className="home-panel-empty">
                    <p>Tus partidas activas estan arriba en Continuar.</p>
                  </div>
                ) : (
                  <ul className="home-activity-list">
                    {moreActiveGames.map((game) => (
                      <li key={game.roomCode}>
                        <button
                          className="home-activity-row is-active"
                          onClick={() => navigate({ to: '/battle/$code', params: { code: game.roomCode } })}
                          type="button"
                        >
                          <span>En curso · {game.roomCode}</span>
                          <strong>Reanudar</strong>
                        </button>
                      </li>
                    ))}
                    {recentGames.map((game) => (
                      <li key={`${game.roomCode}-${game.updatedAt}`}>
                        <div className="home-activity-row">
                          <span>{game.roomCode} · {game.result ?? 'finalizada'}</span>
                          <time dateTime={game.updatedAt}>{new Date(game.updatedAt).toLocaleDateString()}</time>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </article>

          <article className="home-panel">
            <header className="home-panel-head home-panel-head-tabs">
              <h2>Ranking global</h2>
              <div className="home-rank-tabs" role="tablist" aria-label="Orden del ranking">
                <button className={sort === 'wins' ? 'active' : ''} onClick={() => setSort('wins')} type="button">Victorias</button>
                <button className={sort === 'winRate' ? 'active' : ''} onClick={() => setSort('winRate')} type="button">%</button>
              </div>
            </header>
            {leaderboard.length === 0 ? (
              <div className="home-panel-empty">
                <p>El ranking se actualiza cuando hay partidas registradas.</p>
              </div>
            ) : (
              <ol className="home-rank-list">
                {leaderboard.map((row) => (
                  <li key={row.userId} className="home-rank-row">
                    <span className="home-rank-pos">{row.rank}</span>
                    <span className="home-rank-name">{row.name}</span>
                    <strong className="home-rank-score">
                      {sort === 'winRate' ? `${row.winRate}%` : row.wins}
                    </strong>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </section>

        {authUser && (
          <section className="home-perks" aria-label="Cosmeticos">
            <h2 className="home-perks-title">Tableros y fichas</h2>
            <ul className="home-perks-list">
              <li><Trophy size={15} /> Clasico <span>incluido</span></li>
              <li><Trophy size={15} /> Madera / Plano <span>2+ victorias</span></li>
              <li><Trophy size={15} /> Torneo / Piedra <span>4-6 victorias</span></li>
            </ul>
            <Link className="home-perks-link" to="/profile">
              Configurar en perfil
              <ChevronRight size={14} />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
