import { createFileRoute } from '@tanstack/react-router';
import { CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api, getAuthUser } from '../services/api';

export const Route = createFileRoute('/premium')({
  component: PremiumPage
});

function PremiumPage() {
  const authUser = getAuthUser();
  const [loading, setLoading] = useState(false);
  const [premium, setPremium] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authUser) return;
    api.getPremiumStatus(authUser.token).then((status) => setPremium(status.premium)).catch(() => null);
  }, [authUser]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authUser) {
      setError('Inicia sesion con Google para comprar el pase.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const checkout = await api.createPremiumCheckout(authUser.token);
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stripe no pudo iniciar el checkout.');
      setLoading(false);
    }
  }

  return (
    <main className="form-screen">
      <form className="command-panel premium-panel" onSubmit={submit}>
        <p className="eyebrow">Stripe Checkout</p>
        <h1>Trainer Premium Pass</h1>
        <div className="premium-icon"><Sparkles size={34} /></div>
        <p className="form-hint">Desbloquea cosmeticos arcade: marco premium, brillo de perfil y futuras skins visuales de sala.</p>
        {authUser ? (
          <div className="google-session">
            <ShieldCheck size={18} />
            <span>{authUser.email}</span>
          </div>
        ) : (
          <a className="google-button" href={api.googleLoginUrl('/premium')}>
            <ShieldCheck size={18} />
            Continuar con Google
          </a>
        )}
        {premium && <p className="premium-owned">Pase activo en esta cuenta.</p>}
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={loading || premium || !authUser} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />}
          {premium ? 'Premium activo' : 'Comprar pase de prueba'}
        </button>
      </form>
    </main>
  );
}
