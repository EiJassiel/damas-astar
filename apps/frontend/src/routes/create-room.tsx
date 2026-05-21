import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, getAuthUser, saveSession } from '../services/api';

export const Route = createFileRoute('/create-room')({
  component: CreateRoomPage
});

function CreateRoomPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authUser) {
      setError('Inicia sesion con Google para crear una sala.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await api.createRoom(authUser.token);
      saveSession({ code: room.code, playerId: room.playerId, playerName: authUser.name, playerEmail: authUser.email });
      await navigate({ to: '/lobby/$code', params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="form-screen">
      <form className="command-panel" onSubmit={submit}>
        <p className="eyebrow">Nueva sala</p>
        <h1>Activa una Battle Room</h1>
        <AuthBox next="/create-room" />
        <p className="form-hint">Tu nombre y correo salen directamente de Google.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={loading || !authUser} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
          Crear
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
