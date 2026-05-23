import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AuthBox } from '../components/AuthBox';
import { FormFeedback } from '../components/FormFeedback';
import { PanelIcon, ScreenShell } from '../components/ScreenShell';
import { isAuthSessionError } from '../components/SessionExpiredNotice';
import { useAuthUser } from '../context/AuthContext';
import { api, getAuthUser, saveSession } from '../services/api';

export const Route = createFileRoute('/create-room')({
  component: CreateRoomPage
});

function CreateRoomPage() {
  const navigate = useNavigate();
  const { authUser, markSessionExpired } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const user = getAuthUser();
    if (!user) {
      setError('Inicia sesion con Google para crear una sala.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await api.createRoom(user.token);
      saveSession({ code: room.code, playerId: room.playerId, playerName: user.name, playerEmail: user.email });
      await navigate({ to: '/lobby/$code', params: { code: room.code } });
    } catch (err) {
      if (isAuthSessionError(err)) {
        markSessionExpired();
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear la sala.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell backLabel="Arena">
      <form className="command-panel" onSubmit={submit}>
        <PanelIcon><Plus size={28} /></PanelIcon>
        <h1>Crear sala</h1>
        <AuthBox next="/create-room" />
        <FormFeedback error={error} next="/create-room" />
        <button className="primary-button panel-submit" disabled={loading || !authUser} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
          Crear sala
        </button>
      </form>
    </ScreenShell>
  );
}
