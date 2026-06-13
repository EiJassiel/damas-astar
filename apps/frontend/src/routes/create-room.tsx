import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Bot, Loader2, Route as RouteIcon, Swords } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { useAuth } from '../context/AuthContext';
import { api, saveSession } from '../services/api';

export const Route = createFileRoute('/create-room')({
  component: CreateRoomPage
});

function CreateRoomPage() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const room = authUser
        ? await api.createCheckersRoom(difficulty)
        : await api.createGuestCheckersRoom(difficulty);
      await api.addCheckersBot(room.code, difficulty, authUser ? undefined : room.playerId);
      saveSession({ code: room.code, playerId: room.playerId, playerName: room.playerName });
      await navigate({ to: '/lobby/$code', params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bot-entry-screen">
      <Link className="bot-entry-back" to="/">Volver</Link>
      <form className="bot-entry-card" onSubmit={submit}>
        <div className="bot-entry-icon"><Bot size={24} /></div>
        <p className="eyebrow">{authUser ? 'Partida guardada' : 'Partida rapida'}</p>
        <h1>Damas</h1>
        <p className="bot-entry-copy">
          {authUser
            ? `Jugador: ${authUser.name}. La partida queda ligada a tu cuenta.`
            : 'Juega sin cuenta. Si quieres guardar la partida y ver tu historial, crea una cuenta.'}
        </p>
        {!authUser && (
          <p className="muted-copy">
            <Link to="/register">Crear cuenta</Link>
            {' · '}
            <Link to="/login">Iniciar sesion</Link>
          </p>
        )}
        <label htmlFor="create-bot-difficulty">Dificultad</label>
        <select
          id="create-bot-difficulty"
          className="bot-entry-input"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}
        >
          <option value="easy">Facil</option>
          <option value="medium">Media</option>
          <option value="hard">Dificil</option>
        </select>
        <p className="muted-copy">
          <RouteIcon size={16} aria-hidden="true" />
          La computadora juega con A*.
        </p>
        <FormFeedback error={error} />
        <button className="bot-entry-submit" disabled={loading} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <Swords size={18} />}
          Crear partida
        </button>
      </form>
    </main>
  );
}
