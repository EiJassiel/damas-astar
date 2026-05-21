import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
      setError('Google no devolvio una sesion valida.');
      return;
    }

    try {
      saveAuthToken(token);
      navigate({ to: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion con Google.');
    }
  }, [navigate]);

  return (
    <main className="form-screen">
      <section className="command-panel">
        <p className="eyebrow">Google OAuth</p>
        <h1>{error ? 'Sesion no valida' : 'Validando entrenador'}</h1>
        {error ? <p className="error">{error}</p> : <p className="muted auth-loading"><Loader2 className="spin" size={18} /> Conectando con Google...</p>}
      </section>
    </main>
  );
}
