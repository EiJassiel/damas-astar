import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Loader2, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { api, saveAuth } from '../services/api';

export const Route = createFileRoute('/register')({
  component: RegisterPage
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.register(name, email, password);
      saveAuth(result.token, result.user);
      await navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bot-entry-screen">
      <form className="bot-entry-card" onSubmit={submit}>
        <div className="bot-entry-icon"><UserPlus size={24} /></div>
        <p className="eyebrow">Nueva cuenta</p>
        <h1>Registro</h1>
        <label htmlFor="register-name">Nombre</label>
        <input id="register-name" className="bot-entry-input" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="register-email">Correo</label>
        <input id="register-email" className="bot-entry-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="register-password">Contrasena</label>
        <input id="register-password" className="bot-entry-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <FormFeedback error={error} />
        <button className="bot-entry-submit" disabled={loading} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <UserPlus size={18} />}
          Crear cuenta
        </button>
        <p className="bot-entry-copy">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </form>
    </main>
  );
}
