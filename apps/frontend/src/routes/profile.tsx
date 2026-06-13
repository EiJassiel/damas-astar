import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { BoardTheme, PieceStyle } from '../types/checkers';

export const Route = createFileRoute('/profile')({
  component: ProfilePage
});

const boardLabels: Record<BoardTheme, string> = {
  classic: 'Clasico',
  wood: 'Madera',
  neon: 'Torneo'
};

const pieceLabels: Record<PieceStyle, string> = {
  sphere: 'Redondas',
  flat: 'Planas',
  marble: 'Piedra'
};

function ProfilePage() {
  const { authUser, refresh } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.getProfile>>['stats']>(null);
  const [name, setName] = useState(authUser?.name ?? '');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(authUser?.boardTheme ?? 'classic');
  const [pieceStyle, setPieceStyle] = useState<PieceStyle>(authUser?.pieceStyle ?? 'sphere');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authUser) return;
    setName(authUser.name);
    setBoardTheme(authUser.boardTheme);
    setPieceStyle(authUser.pieceStyle);
    api.getProfile().then((profile) => setStats(profile.stats)).catch(() => undefined);
  }, [authUser]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateProfile({ name, boardTheme, pieceStyle }),
    onSuccess: async () => {
      setSuccess('Perfil actualizado.');
      setError('');
      await refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo guardar.')
  });

  if (!authUser) {
    return (
      <main className="bot-entry-screen">
        <div className="bot-entry-card">
          <h1>Perfil</h1>
          <p className="bot-entry-copy">Debes iniciar sesion para ver tu perfil.</p>
          <Link className="bot-entry-submit" to="/login">Iniciar sesion</Link>
        </div>
      </main>
    );
  }

  const winRate = stats && stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 1000) / 10 : 0;
  const avgMoves = stats && stats.winsForMoveAverage > 0 ? Math.round((stats.totalMovesInWins / stats.winsForMoveAverage) * 10) / 10 : 0;

  return (
    <main className="bot-entry-screen profile-screen">
      <section className="bot-entry-card profile-card">
        <div className="bot-entry-icon"><Palette size={24} /></div>
        <p className="eyebrow">Jugador</p>
        <h1>{authUser.name}</h1>
        <p className="bot-entry-copy">{authUser.email}</p>

        {stats && (
          <div className="profile-stats-grid">
            <p><span>Partidas</span><strong>{stats.gamesPlayed}</strong></p>
            <p><span>Victorias</span><strong>{stats.wins}</strong></p>
            <p><span>Derrotas</span><strong>{stats.losses}</strong></p>
            <p><span>Empates</span><strong>{stats.draws}</strong></p>
            <p><span>% victorias</span><strong>{winRate}%</strong></p>
            <p><span>Racha actual</span><strong>{stats.winStreak}</strong></p>
            <p><span>Mejor racha</span><strong>{stats.bestWinStreak}</strong></p>
            <p><span>Mov. prom. en victorias</span><strong>{avgMoves}</strong></p>
          </div>
        )}

        <label htmlFor="profile-name">Nombre</label>
        <input id="profile-name" className="bot-entry-input" value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="profile-board">Tablero</label>
        <select id="profile-board" className="bot-entry-input" value={boardTheme} onChange={(e) => setBoardTheme(e.target.value as BoardTheme)}>
          {authUser.unlockedThemes.map((theme) => (
            <option key={theme} value={theme}>{boardLabels[theme]}</option>
          ))}
        </select>

        <label htmlFor="profile-pieces">Fichas</label>
        <select id="profile-pieces" className="bot-entry-input" value={pieceStyle} onChange={(e) => setPieceStyle(e.target.value as PieceStyle)}>
          {authUser.unlockedPieceStyles.map((style) => (
            <option key={style} value={style}>{pieceLabels[style]}</option>
          ))}
        </select>

        <FormFeedback error={error} />
        {success && <p className="form-success">{success}</p>}
        <button className="bot-entry-submit" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
          {saveMutation.isPending ? <Loader2 className="spin" size={18} /> : 'Guardar perfil'}
        </button>
        <Link className="bot-entry-back-inline" to="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
