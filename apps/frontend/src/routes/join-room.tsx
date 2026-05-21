import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DoorOpen, Loader2, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, getAuthUser, saveSession } from '../services/api';

export const Route = createFileRoute('/join-room')({
  component: JoinRoomPage
});

function JoinRoomPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authUser) {
      setError('Inicia sesion con Google para entrar a una sala.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await api.joinRoom(code.toUpperCase(), authUser.token);
      saveSession({ code: room.code, playerId: room.playerId, playerName: authUser.name, playerEmail: authUser.email });
      await navigate({ to: '/lobby/$code', params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="form-screen">
      <form className="command-panel" onSubmit={submit}>
        <p className="eyebrow">Entrar a sala</p>
        <h1>Conecta al duelo</h1>
        <AuthBox next="/join-room" />
        <label htmlFor="join-room-code">Codigo</label>
        <input id="join-room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} required />
        <p className="form-hint">El jugador se identifica con su sesion Google activa.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={loading || !authUser} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <DoorOpen size={18} />}
          Unirse
        </button>
      </form>
    </main>
  );
}

function AuthBox({ next }: { next: string }) {
  const authUser = getAuthUser();
  if (authUser) {
    return (
      <div className="google-session">
        <ShieldCheck size={18} />
        <span>{authUser.email}</span>
      </div>
    );
  }
  return (
    <a className="google-button" href={api.googleLoginUrl(next)}>
      <ShieldCheck size={18} />
      Continuar con Google
    </a>
  );
}
