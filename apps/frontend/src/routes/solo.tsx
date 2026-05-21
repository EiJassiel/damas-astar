import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bot, Loader2, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, getAuthUser, saveSession } from '../services/api';

export const Route = createFileRoute('/solo')({
  component: SoloPage
});

function SoloPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authUser) {
      setError('Inicia sesion con Google para jugar modo solitario.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await api.createSoloRoom(authUser.token);
      saveSession({ code: room.code, playerId: room.playerId, playerName: authUser.name, playerEmail: authUser.email });
      await navigate({ to: '/battle/$code', params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el modo solitario.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="form-screen">
      <form className="command-panel" onSubmit={submit}>
        <p className="eyebrow">Practica inmediata</p>
        <h1>Modo solitario</h1>
        <AuthBox next="/solo" />
        <p className="form-hint">Tu entrenador se crea desde tu cuenta Google.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={loading || !authUser} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
          Batallar contra bot
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
