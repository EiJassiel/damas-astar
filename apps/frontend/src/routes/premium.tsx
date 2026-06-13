import { createFileRoute, Link } from '@tanstack/react-router';
import { Crown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Route = createFileRoute('/premium')({
  component: PremiumPage
});

function PremiumPage() {
  const { authUser, refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(authUser?.premium ? 'Tienda activada' : 'Sin compra activa');
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || !authUser) return;
    setLoading(true);
    api.verifyPremiumCheckout(sessionId)
      .then((result) => {
        setStatus(result.premium ? 'Tienda activada' : `Pago ${result.paymentStatus}`);
        return refresh();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo verificar el pago.'))
      .finally(() => setLoading(false));
  }, [authUser, refresh]);

  async function checkout() {
    setLoading(true);
    setError('');
    try {
      const result = await api.createPremiumCheckout();
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar Stripe Checkout.');
      setLoading(false);
    }
  }

  if (!authUser) {
    return (
      <main className="bot-entry-screen">
        <section className="bot-entry-card">
          <div className="bot-entry-icon"><Crown size={24} /></div>
          <h1>Tienda</h1>
          <p className="bot-entry-copy">Inicia sesion para comprar tableros y fichas en modo prueba.</p>
          <Link className="bot-entry-submit" to="/login">Iniciar sesion</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bot-entry-screen">
      <section className="bot-entry-card">
        <div className="bot-entry-icon"><Crown size={24} /></div>
        <p className="eyebrow">Compra de prueba</p>
        <h1>Tienda de damas</h1>
        <p className="bot-entry-copy">
          Compra de prueba para desbloquear tableros y fichas.
        </p>
        <p className="muted-copy">{status}</p>
        <FormFeedback error={error} />
        <button className="bot-entry-submit" disabled={loading || authUser.premium} onClick={checkout} type="button">
          {loading ? <Loader2 className="spin" size={18} /> : <Crown size={18} />}
          {authUser.premium ? 'Compra activa' : 'Comprar con Stripe'}
        </button>
        <Link className="bot-entry-secondary" to="/profile">Volver al perfil</Link>
      </section>
    </main>
  );
}
