import { createFileRoute } from '@tanstack/react-router';
import { CreditCard, Crown, Loader2, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { AuthBox } from '../components/AuthBox';
import { FormFeedback } from '../components/FormFeedback';
import { PanelIcon, ScreenShell } from '../components/ScreenShell';
import { isAuthSessionError } from '../components/SessionExpiredNotice';
import { useAuthUser } from '../context/AuthContext';
import { api, getAuthUser } from '../services/api';

export const Route = createFileRoute('/premium')({
  component: PremiumPage
});

function PremiumPage() {
  const { authUser, premium, refreshPremium, markSessionExpired } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void refreshPremium();
  }, [authUser, refreshPremium]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const user = getAuthUser();
    if (!user) {
      setError('Inicia sesion con Google para comprar el pase.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const checkout = await api.createPremiumCheckout(user.token);
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      if (isAuthSessionError(err)) {
        markSessionExpired();
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.');
      }
      setLoading(false);
    }
  }

  return (
    <ScreenShell backLabel="Arena">
      <form className="command-panel premium-panel panel-tone-premium" onSubmit={submit}>
        <PanelIcon><Sparkles size={30} /></PanelIcon>
        <h1>Trainer Premium Pass</h1>
        {premium && (
          <div className="premium-owned">
            <Crown size={16} />
            <strong>Pase activo</strong>
          </div>
        )}
        <AuthBox next="/premium" />
        <FormFeedback error={error} next="/premium" />
        <button className="primary-button panel-submit premium-cta" disabled={loading || premium || !authUser} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />}
          {premium ? 'Premium activo' : 'Comprar pase'}
        </button>
      </form>
    </ScreenShell>
  );
}
