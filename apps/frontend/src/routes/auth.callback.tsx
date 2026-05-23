import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ScreenShell } from '../components/ScreenShell';
import { saveAuthToken } from '../services/api';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const next = params.get('next') || '/';
    if (!token) {
      setError('No se pudo iniciar sesion.');
      return;
    }

    try {
      saveAuthToken(token);
      navigate({ to: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    }
  }, [navigate]);

  return (
    <ScreenShell backLabel="Arena">
      <section className={`command-panel${error ? ' panel-tone-danger' : ''}`}>
        <h1>{error ? 'Error de sesion' : 'Conectando...'}</h1>
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <p className="muted auth-loading">
            <Loader2 className="spin" size={18} />
          </p>
        )}
      </section>
    </ScreenShell>
  );
}
