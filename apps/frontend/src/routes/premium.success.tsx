import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PanelIcon, ScreenShell } from '../components/ScreenShell';
import { useAuthUser } from '../context/AuthContext';
import { api, getAuthUser } from '../services/api';

export const Route = createFileRoute('/premium/success')({
  component: PremiumSuccessPage
});

function PremiumSuccessPage() {
  const { refreshPremium, premium } = useAuthUser();
  const [state, setState] = useState<'loading' | 'active' | 'pending' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    async function verifyPayment() {
      const user = getAuthUser();
      if (!user) {
        if (!cancelled) setState('error');
        return;
      }

      const attempts = sessionId ? 8 : 4;
      for (let i = 0; i < attempts; i += 1) {
        try {
          if (sessionId) {
            const result = await api.verifyPremiumCheckout(user.token, sessionId);
            await refreshPremium();
            if (!cancelled && (result.premium || result.paymentStatus === 'paid')) {
              setState('active');
              return;
            }
          } else {
            const status = await api.getPremiumStatus(user.token);
            await refreshPremium();
            if (!cancelled && status.premium) {
              setState('active');
              return;
            }
          }
        } catch {
          // retry
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }

      if (!cancelled) setState('pending');
    }

    void verifyPayment();
    return () => {
      cancelled = true;
    };
  }, [refreshPremium]);

  useEffect(() => {
    if (premium && state === 'loading') setState('active');
  }, [premium, state]);

  const title =
    state === 'active'
      ? 'Premium activado'
      : state === 'pending'
        ? 'Activando...'
        : state === 'error'
          ? 'Inicia sesion'
          : 'Verificando...';

  return (
    <ScreenShell backLabel="Arena">
      <section className={`command-panel premium-panel panel-tone-${state === 'active' ? 'success' : state === 'error' ? 'danger' : 'premium'}`}>
        <PanelIcon>
          {state === 'loading' ? <Loader2 className="spin" size={30} /> : state === 'active' ? <CheckCircle2 size={30} /> : state === 'error' ? <XCircle size={30} /> : <Sparkles size={30} />}
        </PanelIcon>
        <h1>{title}</h1>
        <Link className="primary-button panel-submit" to="/">
          Volver al juego
        </Link>
        {state !== 'active' && (
          <Link className="secondary-button panel-submit" to="/premium">
            Ver pase
          </Link>
        )}
      </section>
    </ScreenShell>
  );
}
