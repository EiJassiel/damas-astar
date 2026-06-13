import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Loader2, LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { api, saveAuth } from '../services/api';

export const Route = createFileRoute('/login')({
  component: LoginPage
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.login(email, password);
      saveAuth(result.token, result.user);
      await navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bot-entry-screen">
      <form className="bot-entry-card" onSubmit={submit}>
        <div className="bot-entry-icon"><LogIn size={24} /></div>
        <p className="eyebrow">Acceso</p>
        <h1>Iniciar sesion</h1>
        <label htmlFor="login-email">Correo</label>
        <input id="login-email" className="bot-entry-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="login-password">Contrasena</label>
        <input id="login-password" className="bot-entry-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <FormFeedback error={error} />
        <button className="bot-entry-submit" disabled={loading} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
          Entrar
        </button>
        <p className="bot-entry-copy">
          ¿No tienes cuenta? <Link to="/register">Registrate</Link>
        </p>
      </form>
    </main>
  );
}
