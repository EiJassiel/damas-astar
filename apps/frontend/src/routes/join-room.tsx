import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { DoorOpen, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { PanelIcon, ScreenShell } from '../components/ScreenShell';
import { useAuth } from '../context/AuthContext';
import { api, saveSession } from '../services/api';

export const Route = createFileRoute('/join-room')({
  component: JoinRoomPage
});

function JoinRoomPage() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authUser) return;
    setLoading(true);
    setError('');
    try {
      const room = await api.joinCheckersRoom(code.toUpperCase());
      saveSession({ code: room.code, playerId: room.playerId, playerName: room.playerName });
      await navigate({ to: '/lobby/$code', params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar.');
    } finally {
      setLoading(false);
    }
  }

  if (!authUser) {
    return (
      <ScreenShell backLabel="Inicio">
        <section className="command-panel">
          <PanelIcon><DoorOpen size={28} /></PanelIcon>
          <p className="eyebrow">Partida</p>
          <h1>Unirse</h1>
          <p className="bot-entry-copy">Para unirte a una partida guardada necesitas una cuenta.</p>
          <div className="landing-actions">
            <Link className="bot-entry-submit" to="/register">Crear cuenta</Link>
            <Link className="secondary-button landing-secondary" to="/login">Iniciar sesion</Link>
          </div>
        </section>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell backLabel="Inicio">
      <form className="command-panel checkers-panel" onSubmit={submit}>
        <PanelIcon><DoorOpen size={28} /></PanelIcon>
        <p className="eyebrow">Partida</p>
        <h1>Unirse</h1>
        <label htmlFor="join-code">Codigo de partida</label>
        <input id="join-code" className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} required />
        <FormFeedback error={error} />
        <button className="primary-button panel-submit" disabled={loading || code.trim().length < 4} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <DoorOpen size={18} />}
          Entrar
        </button>
      </form>
    </ScreenShell>
  );
}
