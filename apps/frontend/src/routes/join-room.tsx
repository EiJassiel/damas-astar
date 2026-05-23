import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DoorOpen, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AuthBox } from '../components/AuthBox';
import { FormFeedback } from '../components/FormFeedback';
import { PanelIcon, ScreenShell } from '../components/ScreenShell';
import { isAuthSessionError } from '../components/SessionExpiredNotice';
import { useAuthUser } from '../context/AuthContext';
import { api, getAuthUser, saveSession } from '../services/api';

export const Route = createFileRoute('/join-room')({
  component: JoinRoomPage
});

function JoinRoomPage() {
  const navigate = useNavigate();
  const { authUser, markSessionExpired } = useAuthUser();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const user = getAuthUser();
    if (!user) {
      setError('Inicia sesion con Google para entrar a una sala.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await api.joinRoom(code.toUpperCase(), user.token);
      saveSession({ code: room.code, playerId: room.playerId, playerName: user.name, playerEmail: user.email });
      await navigate({ to: '/lobby/$code', params: { code: room.code } });
    } catch (err) {
      if (isAuthSessionError(err)) {
        markSessionExpired();
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo entrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell backLabel="Arena">
      <form className="command-panel" onSubmit={submit}>
        <PanelIcon><DoorOpen size={28} /></PanelIcon>
        <h1>Unirse a sala</h1>
        <AuthBox next="/join-room" />
        <label htmlFor="join-room-code">Codigo</label>
        <input
          id="join-room-code"
          className="code-input"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABCDEF"
          required
          spellCheck={false}
        />
        <FormFeedback error={error} next="/join-room" />
        <button className="primary-button panel-submit" disabled={loading || !authUser || code.length < 6} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <DoorOpen size={18} />}
          Unirse
        </button>
      </form>
    </ScreenShell>
  );
}
